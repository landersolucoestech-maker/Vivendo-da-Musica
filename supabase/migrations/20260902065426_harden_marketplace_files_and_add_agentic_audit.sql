do $$
begin
  if to_regclass('public.marketplace_files') is not null then
    execute 'revoke all on table public.marketplace_files from anon, authenticated';
    execute 'grant select, insert, update, delete on table public.marketplace_files to service_role';
  end if;
end;
$$;

create table if not exists app_private.agentic_audit_log (
  id uuid primary key default gen_random_uuid(),
  correlation_id text not null,
  workflow_id text not null,
  manifest_id text,
  agent_id text not null,
  capability text not null,
  phase text not null check (phase in ('admission','pre_execution','tool_call','tool_result','error','review','verification','completion')),
  risk text not null check (risk in ('read','write','privileged','destructive')),
  resource text,
  evidence_type text not null,
  payload jsonb not null default '{}'::jsonb,
  previous_hash text,
  record_hash text not null,
  created_at timestamptz not null default now()
);

alter table app_private.agentic_audit_log enable row level security;

revoke all on table app_private.agentic_audit_log from public, anon, authenticated;
revoke update, delete, truncate on table app_private.agentic_audit_log from service_role;
grant select, insert on table app_private.agentic_audit_log to service_role;

create unique index if not exists agentic_audit_log_record_hash_uidx
  on app_private.agentic_audit_log(record_hash);
create index if not exists agentic_audit_log_workflow_created_idx
  on app_private.agentic_audit_log(workflow_id, created_at);
create index if not exists agentic_audit_log_correlation_created_idx
  on app_private.agentic_audit_log(correlation_id, created_at);

create or replace function app_private.prevent_agentic_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'agentic_audit_log is append-only';
end;
$$;

revoke all on function app_private.prevent_agentic_audit_mutation() from public, anon, authenticated, service_role;

drop trigger if exists agentic_audit_log_no_update_delete on app_private.agentic_audit_log;
create trigger agentic_audit_log_no_update_delete
before update or delete on app_private.agentic_audit_log
for each row execute function app_private.prevent_agentic_audit_mutation();

drop trigger if exists agentic_audit_log_no_truncate on app_private.agentic_audit_log;
create trigger agentic_audit_log_no_truncate
before truncate on app_private.agentic_audit_log
for each statement execute function app_private.prevent_agentic_audit_mutation();
