#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_PROJECT_REF:?SUPABASE_PROJECT_REF is required}"
: "${SUPABASE_ACCESS_TOKEN:?SUPABASE_ACCESS_TOKEN is required}"

baseline_version="20260804103000"
artifact_dir="${GITHUB_WORKSPACE:-.}/artifacts/supabase-dev"
diff_file="${artifact_dir}/canonical-vs-remote.sql"
list_before="${artifact_dir}/migration-list-before.txt"
list_after="${artifact_dir}/migration-list-after.txt"
mkdir -p "$artifact_dir"

# Capture canonical versions before the disposable runner worktree receives any
# remote-only migration files.
mapfile -t canonical_versions < <(
  find supabase/migrations -maxdepth 1 -type f -printf '%f\n' \
    | sed -nE 's/^([0-9]{14})_[A-Za-z0-9._-]+\.sql$/\1/p' \
    | sort -u
)

env -u SUPABASE_DB_PASSWORD npx supabase migration list --linked | tee "$list_before"

remote_has_baseline=false
if awk -F'|' -v baseline="$baseline_version" '
  NF >= 2 {
    remote=$2
    gsub(/[^0-9]/, "", remote)
    if (remote == baseline) found=1
  }
  END { exit(found ? 0 : 1) }
' "$list_before"; then
  remote_has_baseline=true
fi

if [[ "$remote_has_baseline" == "true" ]]; then
  # The one-time equivalence gate already passed on a previous deployment.
  # Accept remote-only history files in this disposable checkout, then apply
  # only canonical migrations added after the baseline.
  printf 'y\n' | env -u SUPABASE_DB_PASSWORD npx supabase migration fetch --linked
  echo "Canonical DEV migration baseline is already established. Applying only migrations newer than the baseline."
  env -u SUPABASE_DB_PASSWORD npx supabase db push --linked --include-all
  env -u SUPABASE_DB_PASSWORD npx supabase migration list --linked | tee "$list_after"
  exit 0
fi

# First-time reconciliation: compare the complete canonical migration chain
# with the linked database without trusting either migration history. Include
# authentication triggers, storage policies/buckets and private auth schemas.
# Use the stable migra engine; pg-delta is still experimental and can fail on
# otherwise valid dependency cycles involving altered enum-backed columns.
set +e
timeout --signal=TERM --kill-after=30s 20m \
  env -u SUPABASE_DB_PASSWORD npx supabase db diff \
    --linked \
    --schema auth,storage,public,app_private,authz_private \
    --use-migra \
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

# Schema equivalence has been proved. Remote-only migration files may now be
# accepted in the disposable checkout so db push can evaluate both histories.
printf 'y\n' | env -u SUPABASE_DB_PASSWORD npx supabase migration fetch --linked

# Extract remote migration versions from the original list. Only canonical
# versions missing from the remote history are marked as applied.
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

missing_versions=()
for version in "${canonical_versions[@]}"; do
  if [[ -z "${remote_set[$version]+x}" ]]; then
    missing_versions+=("$version")
  fi
done

if [[ "${#missing_versions[@]}" -eq 0 ]]; then
  echo "::error title=Supabase migration baseline missing::Schemas are equivalent, but no canonical migration records require reconciliation. Baseline was not modified."
  exit 3
fi

if [[ ! " ${missing_versions[*]} " =~ " ${baseline_version} " ]]; then
  echo "::error title=Supabase baseline invariant failed::The baseline migration is not among the missing canonical history records."
  exit 4
fi

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

env -u SUPABASE_DB_PASSWORD npx supabase migration list --linked | tee "$list_after"

# This must be a no-op after an equivalent-schema history reconciliation.
env -u SUPABASE_DB_PASSWORD npx supabase db push --linked --include-all --dry-run

echo "Supabase DEV schema and migration history reconciled safely at baseline ${baseline_version}."
