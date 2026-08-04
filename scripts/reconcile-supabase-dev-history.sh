#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_PROJECT_REF:?SUPABASE_PROJECT_REF is required}"
: "${SUPABASE_ACCESS_TOKEN:?SUPABASE_ACCESS_TOKEN is required}"

artifact_dir="${GITHUB_WORKSPACE:-.}/artifacts/supabase-dev"
diff_file="${artifact_dir}/canonical-vs-remote.sql"
list_before="${artifact_dir}/migration-list-before.txt"
list_after="${artifact_dir}/migration-list-after.txt"
mkdir -p "$artifact_dir"

# Compare the canonical migration chain with the linked database without using
# the remote migration history as a source of truth. Authentication triggers,
# storage buckets/policies and private authorization schemas are included.
set +e
timeout --signal=TERM --kill-after=30s 20m \
  env -u SUPABASE_DB_PASSWORD npx supabase db diff \
    --linked \
    --schema auth,storage,public,app_private,authz_private \
    --use-pg-delta \
    >"$diff_file"
diff_status=$?
set -e

if [[ "$diff_status" -ne 0 ]]; then
  echo "::error title=Supabase schema comparison failed::The canonical shadow database could not be compared with the linked DEV database."
  exit "$diff_status"
fi

# Remove blank lines and CLI-only comments before deciding equivalence.
meaningful_diff="$(sed -E '/^[[:space:]]*$/d; /^[[:space:]]*--/d' "$diff_file")"
if [[ -n "$meaningful_diff" ]]; then
  echo "::group::Canonical versus remote schema diff"
  sed -n '1,500p' "$diff_file"
  echo "::endgroup::"
  echo "::error title=Supabase DEV schema drift::The linked database is not equivalent to the canonical dev migrations. Migration history was not modified."
  exit 2
fi

env -u SUPABASE_DB_PASSWORD npx supabase migration list --linked | tee "$list_before"

# Fetch remote-only migration records into the disposable runner worktree. Do
# not overwrite canonical files when timestamps already exist.
printf 'n\n' | env -u SUPABASE_DB_PASSWORD npx supabase migration fetch --linked

# Extract remote migration versions from the pre-fetch list. The CLI table has
# local and remote columns separated by pipes; only 14-digit remote versions are
# considered.
mapfile -t remote_versions < <(
  awk -F'|' '
    NF >= 2 {
      remote=$2
      gsub(/[^0-9]/, "", remote)
      if (remote ~ /^[0-9]{14}$/) print remote
    }
  ' "$list_before" | sort -u
)

declare -A remote_set=()
for version in "${remote_versions[@]}"; do
  remote_set["$version"]=1
done

mapfile -t local_versions < <(
  find supabase/migrations -maxdepth 1 -type f -printf '%f\n' \
    | sed -nE 's/^([0-9]{14})_[A-Za-z0-9._-]+\.sql$/\1/p' \
    | sort -u
)

missing_versions=()
for version in "${local_versions[@]}"; do
  if [[ -z "${remote_set[$version]+x}" ]]; then
    missing_versions+=("$version")
  fi
done

if [[ "${#missing_versions[@]}" -gt 0 ]]; then
  echo "Canonical schemas are equivalent. Repairing ${#missing_versions[@]} missing canonical migration-history records."
  batch=()
  for version in "${missing_versions[@]}"; do
    batch+=("$version")
    if [[ "${#batch[@]}" -ge 40 ]]; then
      env -u SUPABASE_DB_PASSWORD npx supabase migration repair --linked --status applied "${batch[@]}"
      batch=()
    fi
  done
  if [[ "${#batch[@]}" -gt 0 ]]; then
    env -u SUPABASE_DB_PASSWORD npx supabase migration repair --linked --status applied "${batch[@]}"
  fi
else
  echo "Remote migration history already contains every canonical migration version."
fi

env -u SUPABASE_DB_PASSWORD npx supabase migration list --linked | tee "$list_after"

# This must be a no-op after an equivalent-schema history reconciliation.
env -u SUPABASE_DB_PASSWORD npx supabase db push --linked --include-all --dry-run

echo "Supabase DEV schema and migration history reconciled safely."
