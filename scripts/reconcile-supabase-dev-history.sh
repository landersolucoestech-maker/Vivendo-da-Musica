#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_PROJECT_REF:?SUPABASE_PROJECT_REF is required}"
: "${SUPABASE_ACCESS_TOKEN:?SUPABASE_ACCESS_TOKEN is required}"

artifact_dir="${GITHUB_WORKSPACE:-.}/artifacts/supabase-dev"
remote_dump="${artifact_dir}/remote-schema.sql"
remote_snapshot_dump="${artifact_dir}/remote-schema.snapshot.sql"
remote_restore_log="${artifact_dir}/remote-schema.restore.log"
remote_to_canonical_diff="${artifact_dir}/remote-to-canonical.sql"
remote_to_canonical_log="${artifact_dir}/remote-to-canonical.log"
remote_to_canonical_report="${artifact_dir}/remote-to-canonical.report.json"
verified_diff="${artifact_dir}/remote-to-canonical.verified.sql"
verified_log="${artifact_dir}/remote-to-canonical.verified.log"
verified_report="${artifact_dir}/remote-to-canonical.verified.report.json"
migration_list_before="${artifact_dir}/migration-list-before.txt"
migration_list_after="${artifact_dir}/migration-list-after.txt"
local_versions_file="${artifact_dir}/migration-local-versions.txt"
remote_versions_file="${artifact_dir}/migration-remote-versions.txt"
remote_only_file="${artifact_dir}/migration-remote-only.txt"
local_only_file="${artifact_dir}/migration-local-only.txt"
approval_file="${GITHUB_WORKSPACE:-.}/.github/deploy-dev-trigger"
selected_schemas=(public app_private authz_private)
mkdir -p "$artifact_dir"

cleanup() {
  npx supabase stop --no-backup >/dev/null 2>&1 || true
}
trap cleanup EXIT

approval_enabled=false
if [[ -f "$approval_file" ]] \
  && grep -qx "project_ref=${SUPABASE_PROJECT_REF}" "$approval_file" \
  && grep -qx 'source_branch=dev' "$approval_file" \
  && grep -qx 'apply=true' "$approval_file"; then
  approval_enabled=true
fi

run_remote_sql_file() {
  local sql_file="$1"
  local response_file="$2"
  local payload_file
  local http_code

  payload_file="$(mktemp)"
  jq -Rs '{query: .}' <"$sql_file" >"$payload_file"

  http_code="$(curl \
    --silent \
    --show-error \
    --retry 3 \
    --retry-all-errors \
    --connect-timeout 30 \
    --max-time 1200 \
    --output "$response_file" \
    --write-out '%{http_code}' \
    --request POST \
    --header "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    --header 'Content-Type: application/json' \
    --data-binary "@${payload_file}" \
    "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query")"

  rm -f "$payload_file"

  if [[ ! "$http_code" =~ ^2[0-9][0-9]$ ]]; then
    echo "::error title=Supabase Management API query failed::HTTP ${http_code} while executing ${sql_file}."
    cat "$response_file" || true
    return 1
  fi
}

record_migration_versions() {
  local response_file="${artifact_dir}/migration-history-response.json"
  local query_file="${artifact_dir}/migration-history-query.sql"

  find supabase/migrations \
    -maxdepth 1 \
    -type f \
    -printf '%f\n' \
    | sed -nE 's/^([0-9]+)_.+\.sql$/\1/p' \
    | sort -u >"$local_versions_file"

  cat >"$query_file" <<'SQL'
select version
from supabase_migrations.schema_migrations
order by version;
SQL
  run_remote_sql_file "$query_file" "$response_file"

  jq -r '.. | objects | .version? // empty' "$response_file" \
    | grep -E '^[0-9]+$' \
    | sort -u >"$remote_versions_file" || true

  comm -23 "$remote_versions_file" "$local_versions_file" >"$remote_only_file"
  comm -13 "$remote_versions_file" "$local_versions_file" >"$local_only_file"
}

repair_migration_history() {
  local archive_file="${artifact_dir}/archive-migration-history.sql"
  local archive_response="${artifact_dir}/archive-migration-history.response.json"
  local -a remote_only=()
  local -a local_only=()

  record_migration_versions

  if [[ ! -s "$remote_only_file" && ! -s "$local_only_file" ]]; then
    echo "Remote migration history already matches the canonical migration files."
    return 0
  fi

  echo "::group::Migration history mismatch"
  echo "Remote-only versions:"
  cat "$remote_only_file" || true
  echo "Local-only versions:"
  cat "$local_only_file" || true
  echo "::endgroup::"

  if [[ "$approval_enabled" != "true" ]]; then
    echo "::error title=Supabase migration history drift::Schema state may be correct, but remote migration history differs from the canonical files. Reconciliation was not authorized."
    return 2
  fi

  cat >"$archive_file" <<'SQL'
create schema if not exists legacy_archive;
revoke all on schema legacy_archive from public, anon, authenticated;

do $archive_history$
begin
  if to_regclass('legacy_archive.supabase_migration_history_before_canonical_reconciliation') is null then
    create table legacy_archive.supabase_migration_history_before_canonical_reconciliation
    as table supabase_migrations.schema_migrations with data;
  end if;
end;
$archive_history$;

revoke all on legacy_archive.supabase_migration_history_before_canonical_reconciliation
from public, anon, authenticated;
SQL
  run_remote_sql_file "$archive_file" "$archive_response"

  mapfile -t remote_only <"$remote_only_file"
  mapfile -t local_only <"$local_only_file"

  if (( ${#remote_only[@]} > 0 )); then
    env -u SUPABASE_DB_PASSWORD npx supabase migration repair \
      "${remote_only[@]}" \
      --status reverted \
      --linked
  fi

  if (( ${#local_only[@]} > 0 )); then
    env -u SUPABASE_DB_PASSWORD npx supabase migration repair \
      "${local_only[@]}" \
      --status applied \
      --linked
  fi

  record_migration_versions
  if [[ -s "$remote_only_file" || -s "$local_only_file" ]]; then
    echo "::error title=Migration history reconciliation incomplete::Remote history still differs after repair."
    return 1
  fi

  env -u SUPABASE_DB_PASSWORD npx supabase migration list --linked \
    | tee "$migration_list_after"
}

prepare_remote_snapshot() {
  local dump_file="$1"
  local normalized_file="$2"
  local restore_log="$3"

  env -u SUPABASE_DB_PASSWORD npx supabase db dump \
    --linked \
    --schema "$(IFS=,; echo "${selected_schemas[*]}")" \
    --file "$dump_file"

  if [[ ! -s "$dump_file" ]]; then
    echo "::error title=Remote schema dump is empty::The linked DEV application schemas could not be exported."
    return 1
  fi

  sed -E \
    -e 's/OWNER TO "(pg_database_owner|supabase_admin|supabase_auth_admin|supabase_storage_admin)"/OWNER TO "postgres"/g' \
    -e 's/ALTER DEFAULT PRIVILEGES FOR ROLE "(supabase_admin|supabase_auth_admin|supabase_storage_admin)"/ALTER DEFAULT PRIVILEGES FOR ROLE "postgres"/g' \
    "$dump_file" >"$normalized_file"

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

  docker exec -i "$local_db_container" psql \
    --username postgres \
    --dbname remote_snapshot \
    --set ON_ERROR_STOP=1 <<'SQL'
drop schema if exists public cascade;
drop schema if exists app_private cascade;
drop schema if exists authz_private cascade;
drop schema if exists auth cascade;
create schema public authorization postgres;
create schema auth authorization postgres;

create table auth.users (
  id uuid primary key
);

create function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create function auth.role()
returns text
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.role', true), '');
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant execute on function auth.role() to anon, authenticated, service_role;
SQL

  docker exec -i "$local_db_container" psql \
    --username postgres \
    --dbname remote_snapshot \
    --set ON_ERROR_STOP=1 \
    --echo-errors \
    <"$normalized_file" 2>&1 | tee "$restore_log"
}

generate_schema_diff() {
  local output_file="$1"
  local log_file="$2"
  local report_file="$3"

  : >"$output_file"
  : >"$log_file"

  for schema in "${selected_schemas[@]}"; do
    {
      printf '\n-- ============================================================\n'
      printf -- '-- Schema: %s | remote snapshot -> canonical migrations\n' "$schema"
      printf -- '-- ============================================================\n\n'
    } >>"$output_file"

    set +e
    "$migra_venv/bin/migra" \
      --unsafe \
      --schema "$schema" \
      "$remote_snapshot_url" \
      "$canonical_url" \
      >>"$output_file" \
      2>>"$log_file"
    migra_status=$?
    set -e

    if [[ "$migra_status" -ne 0 && "$migra_status" -ne 2 ]]; then
      echo "::error title=Supabase schema comparison failed::migra exited with status ${migra_status} while comparing schema ${schema}."
      return "$migra_status"
    fi
  done

  node scripts/classify-supabase-schema-diff.mjs \
    "$output_file" \
    "$report_file"
}

report_is_empty() {
  node -e '
    const fs = require("node:fs");
    const report = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    process.stdout.write(String(report.empty));
  ' "$1"
}

archive_legacy_state() {
  local archive_file="${artifact_dir}/archive-legacy-state.sql"
  local archive_response="${artifact_dir}/archive-legacy-state.response.json"

  cat >"$archive_file" <<'SQL'
create schema if not exists legacy_archive;
revoke all on schema legacy_archive from public, anon, authenticated;

do $archive$
begin
  if to_regclass('public.modulos') is not null
     and to_regclass('legacy_archive.modulos_before_canonical_reconciliation') is null then
    execute 'create table legacy_archive.modulos_before_canonical_reconciliation as table public.modulos with data';
  end if;

  if to_regclass('public.aulas') is not null
     and to_regclass('legacy_archive.aulas_before_canonical_reconciliation') is null then
    execute 'create table legacy_archive.aulas_before_canonical_reconciliation as table public.aulas with data';
  end if;

  if to_regclass('public.progresso_aulas') is not null
     and to_regclass('legacy_archive.progresso_aulas_before_canonical_reconciliation') is null then
    execute 'create table legacy_archive.progresso_aulas_before_canonical_reconciliation as table public.progresso_aulas with data';
  end if;

  if to_regclass('public.community_group_members') is not null
     and to_regclass('legacy_archive.community_group_members_before_id_removal') is null then
    execute 'create table legacy_archive.community_group_members_before_id_removal as select to_jsonb(source_row) as row_data from public.community_group_members source_row';
  end if;

  if to_regclass('public.coupon_redemptions') is not null
     and to_regclass('legacy_archive.coupon_redemptions_before_order_reference_removal') is null then
    execute 'create table legacy_archive.coupon_redemptions_before_order_reference_removal as select to_jsonb(source_row) as row_data from public.coupon_redemptions source_row';
  end if;

  if to_regclass('public.lesson_files') is not null
     and to_regclass('legacy_archive.lesson_files_before_aula_id_removal') is null then
    execute 'create table legacy_archive.lesson_files_before_aula_id_removal as select to_jsonb(source_row) as row_data from public.lesson_files source_row';
  end if;
end;
$archive$;

revoke all on all tables in schema legacy_archive from public, anon, authenticated;
SQL

  run_remote_sql_file "$archive_file" "$archive_response"
}

apply_schema_diff() {
  local transaction_file="${artifact_dir}/apply-remote-to-canonical.sql"
  local response_file="${artifact_dir}/apply-remote-to-canonical.response.json"

  {
    printf 'begin;\n'
    printf "set local lock_timeout = '15s';\n"
    printf "set local statement_timeout = '15min';\n"
    cat "$remote_to_canonical_diff"
    printf '\ncommit;\n'
  } >"$transaction_file"

  run_remote_sql_file "$transaction_file" "$response_file"
}

echo "Recording linked migration history before reconciliation..."
env -u SUPABASE_DB_PASSWORD npx supabase migration list --linked \
  | tee "$migration_list_before"

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

migra_venv="${RUNNER_TEMP:-/tmp}/vivendo-migra-venv"
python3 -m venv "$migra_venv"
"$migra_venv/bin/pip" install \
  --disable-pip-version-check \
  'setuptools==75.8.0' \
  'migra==3.0.1663481299' \
  'psycopg2-binary==2.9.10'

echo "Comparing application-owned schemas only: ${selected_schemas[*]}"
prepare_remote_snapshot "$remote_dump" "$remote_snapshot_dump" "$remote_restore_log"
generate_schema_diff \
  "$remote_to_canonical_diff" \
  "$remote_to_canonical_log" \
  "$remote_to_canonical_report"

echo "::group::Remote-to-canonical application schema risk report"
cat "$remote_to_canonical_report"
echo "::endgroup::"

if [[ "$(report_is_empty "$remote_to_canonical_report")" != "true" ]]; then
  if [[ "$approval_enabled" != "true" ]]; then
    echo "::error title=Supabase DEV application schema drift::A stable application-only diff was generated. No remote schema or migration-history changes were executed because apply=true is absent."
    exit 2
  fi

  echo "Archiving legacy application objects before the canonical reconciliation..."
  archive_legacy_state

  echo "Applying the application schema diff in one remote transaction..."
  apply_schema_diff

  echo "Rebuilding the remote snapshot after the transactional apply..."
  prepare_remote_snapshot \
    "${artifact_dir}/remote-schema.verified.sql" \
    "${artifact_dir}/remote-schema.verified.snapshot.sql" \
    "${artifact_dir}/remote-schema.verified.restore.log"
  generate_schema_diff "$verified_diff" "$verified_log" "$verified_report"

  echo "::group::Post-apply schema verification report"
  cat "$verified_report"
  echo "::endgroup::"

  if [[ "$(report_is_empty "$verified_report")" != "true" ]]; then
    echo "::error title=Supabase DEV reconciliation verification failed::The remote application schemas still differ from canonical migrations after apply."
    exit 1
  fi
fi

repair_migration_history

echo "Supabase DEV application schemas and migration history match the canonical migration set."
