#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_PROJECT_REF:?SUPABASE_PROJECT_REF is required}"
: "${SUPABASE_ACCESS_TOKEN:?SUPABASE_ACCESS_TOKEN is required}"

artifact_dir="${GITHUB_WORKSPACE:-.}/artifacts/supabase-dev"
remote_dump="${artifact_dir}/remote-schema.sql"
remote_snapshot_dump="${artifact_dir}/remote-schema.snapshot.sql"
remote_restore_log="${artifact_dir}/remote-schema.restore.log"
remote_to_canonical_diff="${artifact_dir}/remote-to-canonical.sql"
remote_to_canonical_report="${artifact_dir}/remote-to-canonical.report.json"
migration_list="${artifact_dir}/migration-list-before.txt"
selected_schemas=(auth storage public app_private authz_private)
mkdir -p "$artifact_dir"
: >"$remote_to_canonical_diff"

cleanup() {
  npx supabase stop --no-backup >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "Recording linked migration history..."
env -u SUPABASE_DB_PASSWORD npx supabase migration list --linked | tee "$migration_list"

echo "Starting the isolated local Postgres service..."
timeout --signal=TERM --kill-after=30s 10m npx supabase db start

echo "Rebuilding the canonical DEV schema from every migration..."
timeout --signal=TERM --kill-after=30s 15m npx supabase db reset --local

local_db_container="$(docker ps --filter 'name=supabase_db_' --format '{{.Names}}' | head -n 1)"
if [[ -z "$local_db_container" ]]; then
  echo "::error title=Local Supabase database unavailable::Could not identify the local Postgres container."
  exit 1
fi

canonical_url="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
remote_snapshot_url="postgresql://postgres:postgres@127.0.0.1:54322/remote_snapshot"

echo "Dumping the linked DEV schema without data..."
env -u SUPABASE_DB_PASSWORD npx supabase db dump \
  --linked \
  --schema "$(IFS=,; echo "${selected_schemas[*]}")" \
  --file "$remote_dump"

if [[ ! -s "$remote_dump" ]]; then
  echo "::error title=Remote schema dump is empty::The linked DEV schema could not be exported."
  exit 1
fi

echo "Normalizing ownership only for the disposable remote snapshot..."
sed -E \
  -e 's/OWNER TO "(pg_database_owner|supabase_admin|supabase_auth_admin|supabase_storage_admin)"/OWNER TO "postgres"/g' \
  -e 's/ALTER DEFAULT PRIVILEGES FOR ROLE "(supabase_admin|supabase_auth_admin|supabase_storage_admin)"/ALTER DEFAULT PRIVILEGES FOR ROLE "postgres"/g' \
  "$remote_dump" >"$remote_snapshot_dump"

if [[ ! -s "$remote_snapshot_dump" ]]; then
  echo "::error title=Normalized remote schema dump is empty::The disposable snapshot dump could not be generated."
  exit 1
fi

echo "Creating an isolated database for the remote schema snapshot..."
docker exec -i "$local_db_container" psql \
  --username postgres \
  --dbname template1 \
  --set ON_ERROR_STOP=1 <<'SQL'
select pg_terminate_backend(pid)
from pg_stat_activity
where datname = 'remote_snapshot'
  and pid <> pg_backend_pid();
drop database if exists remote_snapshot;
create database remote_snapshot
  with template template0
       owner postgres
       encoding 'UTF8';
SQL

echo "Preparing the isolated remote snapshot database..."
docker exec -i "$local_db_container" psql \
  --username postgres \
  --dbname remote_snapshot \
  --set ON_ERROR_STOP=1 <<'SQL'
drop schema if exists auth cascade;
drop schema if exists storage cascade;
drop schema if exists public cascade;
drop schema if exists app_private cascade;
drop schema if exists authz_private cascade;
create schema public authorization postgres;
SQL

echo "Restoring the linked DEV schema into the isolated snapshot database..."
docker exec -i "$local_db_container" psql \
  --username postgres \
  --dbname remote_snapshot \
  --set ON_ERROR_STOP=1 \
  --echo-errors \
  <"$remote_snapshot_dump" 2>&1 | tee "$remote_restore_log"

migra_venv="${RUNNER_TEMP:-/tmp}/vivendo-migra-venv"
python3 -m venv "$migra_venv"
# Pin the stable migra release used for deterministic PostgreSQL schema diffs.
"$migra_venv/bin/pip" install \
  --disable-pip-version-check \
  'migra==3.0.1663481299' \
  'psycopg2-binary==2.9.10'

for schema in "${selected_schemas[@]}"; do
  {
    printf '\n-- ============================================================\n'
    printf -- '-- Schema: %s | remote snapshot -> canonical migrations\n' "$schema"
    printf -- '-- ============================================================\n\n'
  } >>"$remote_to_canonical_diff"

  "$migra_venv/bin/migra" \
    --unsafe \
    --schema "$schema" \
    "$remote_snapshot_url" \
    "$canonical_url" \
    >>"$remote_to_canonical_diff"
done

node scripts/classify-supabase-schema-diff.mjs \
  "$remote_to_canonical_diff" \
  "$remote_to_canonical_report"

echo "::group::Remote-to-canonical schema risk report"
cat "$remote_to_canonical_report"
echo "::endgroup::"

report_empty="$(node -e '
  const fs = require("node:fs");
  const report = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  process.stdout.write(String(report.empty));
' "$remote_to_canonical_report")"

if [[ "$report_empty" == "true" ]]; then
  echo "The linked DEV schema is equivalent to the canonical migrations."
  exit 0
fi

echo "::error title=Supabase DEV schema drift::A stable remote-to-canonical SQL diff was generated. No remote schema or migration-history changes were executed."
exit 2
