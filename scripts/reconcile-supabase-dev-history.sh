#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_PROJECT_REF:?SUPABASE_PROJECT_REF is required}"
: "${SUPABASE_ACCESS_TOKEN:?SUPABASE_ACCESS_TOKEN is required}"

baseline_version="20260804103000"
artifact_dir="${GITHUB_WORKSPACE:-.}/artifacts/supabase-dev"
canonical_to_remote_diff="${artifact_dir}/canonical-to-remote.sql"
remote_to_canonical_diff="${artifact_dir}/remote-to-canonical.sql"
canonical_to_remote_report="${artifact_dir}/canonical-to-remote.report.json"
remote_to_canonical_report="${artifact_dir}/remote-to-canonical.report.json"
list_before="${artifact_dir}/migration-list-before.txt"
list_after="${artifact_dir}/migration-list-after.txt"
mkdir -p "$artifact_dir"

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
  printf 'y\n' | env -u SUPABASE_DB_PASSWORD npx supabase migration fetch --linked
  echo "Canonical DEV migration baseline is already established. Applying only migrations newer than the baseline."
  env -u SUPABASE_DB_PASSWORD npx supabase db push --linked --include-all
  env -u SUPABASE_DB_PASSWORD npx supabase migration list --linked | tee "$list_after"
  exit 0
fi

run_diff() {
  local from="$1"
  local to="$2"
  local output="$3"
  local label="$4"

  echo "Generating ${label} schema diff (${from} -> ${to})..."
  set +e
  timeout --signal=TERM --kill-after=30s 25m \
    env -u SUPABASE_DB_PASSWORD npx supabase db diff \
      --from "$from" \
      --to "$to" \
      --schema auth,storage,public,app_private,authz_private \
      --use-migra \
      >"$output"
  local status=$?
  set -e

  if [[ "$status" -ne 0 ]]; then
    echo "::error title=Supabase schema comparison failed::Could not generate ${label} (${from} -> ${to})."
    return "$status"
  fi
}

run_diff migrations linked "$canonical_to_remote_diff" "canonical-to-remote"
run_diff linked migrations "$remote_to_canonical_diff" "remote-to-canonical"

node scripts/classify-supabase-schema-diff.mjs \
  "$canonical_to_remote_diff" "$canonical_to_remote_report"
node scripts/classify-supabase-schema-diff.mjs \
  "$remote_to_canonical_diff" "$remote_to_canonical_report"

read_report_empty() {
  node -e '
    const fs = require("node:fs");
    const report = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    process.stdout.write(String(report.empty));
  ' "$1"
}

canonical_to_remote_empty="$(read_report_empty "$canonical_to_remote_report")"
remote_to_canonical_empty="$(read_report_empty "$remote_to_canonical_report")"

if [[ "$canonical_to_remote_empty" != "true" || "$remote_to_canonical_empty" != "true" ]]; then
  echo "::group::Remote-to-canonical risk report"
  cat "$remote_to_canonical_report"
  echo "::endgroup::"
  echo "::error title=Supabase DEV schema drift::Bidirectional diagnostics were generated. Migration history and remote schema were not modified."
  exit 2
fi

printf 'y\n' | env -u SUPABASE_DB_PASSWORD npx supabase migration fetch --linked

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
  echo "::error title=Supabase migration baseline missing::Schemas are equivalent, but no canonical migration records require reconciliation."
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
env -u SUPABASE_DB_PASSWORD npx supabase db push --linked --include-all --dry-run

echo "Supabase DEV schema and migration history reconciled safely at baseline ${baseline_version}."
