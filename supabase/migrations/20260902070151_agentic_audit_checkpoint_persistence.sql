drop trigger if exists agentic_audit_log_no_update_delete on app_private.agentic_audit_log;
drop trigger if exists agentic_audit_log_no_truncate on app_private.agentic_audit_log;
drop table if exists app_private.agentic_audit_log;
drop function if exists app_private.prevent_agentic_audit_mutation();

create table app_private.agentic_audit_records (
  record_hash text primary key,
  evidence_id text not null unique,
  correlation_id text not null,
  workflow_id text,
  agent_id text not null,
  kind text not null check (kind in ('request','admission','policy','approval','tool_call','tool_result','deployment_health','verification','workflow_transition','error')),
  sequence integer not null check (sequence >= 0),
  occurred_at timestamptz not null,
  payload jsonb not null default '{}'::jsonb,
  previous_hash text,
  created_at timestamptz not null default now()
);

create table app_private.agentic_audit_checkpoints (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique,
  phase text not null check (phase in ('pre_execution','post_execution','pre_completion','verification_failed')),
  correlation_id text not null,
  workflow_id text not null,
  agent_id text not null,
  capability text not null,
  risk text not null check (risk in ('read','write','privileged','destructive')),
  head_hash text,
  record_count integer not null check (record_count >= 0),
  persisted_at timestamptz not null default now()
);

create table app_private.agentic_audit_checkpoint_records (
  checkpoint_id uuid not null references app_private.agentic_audit_checkpoints(id) on delete restrict,
  ordinal integer not null check (ordinal >= 0),
  record_hash text not null references app_private.agentic_audit_records(record_hash) on delete restrict,
  primary key (checkpoint_id, ordinal),
  unique (checkpoint_id, record_hash)
);

alter table app_private.agentic_audit_records enable row level security;
alter table app_private.agentic_audit_checkpoints enable row level security;
alter table app_private.agentic_audit_checkpoint_records enable row level security;

revoke all on table app_private.agentic_audit_records from public, anon, authenticated;
revoke all on table app_private.agentic_audit_checkpoints from public, anon, authenticated;
revoke all on table app_private.agentic_audit_checkpoint_records from public, anon, authenticated;
revoke all on table app_private.agentic_audit_records from service_role;
revoke all on table app_private.agentic_audit_checkpoints from service_role;
revoke all on table app_private.agentic_audit_checkpoint_records from service_role;
grant select, insert on table app_private.agentic_audit_records to service_role;
grant select, insert on table app_private.agentic_audit_checkpoints to service_role;
grant select, insert on table app_private.agentic_audit_checkpoint_records to service_role;
grant usage on schema app_private to service_role;
revoke usage on schema app_private from anon, authenticated;

create or replace function app_private.prevent_agentic_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'agentic audit persistence is append-only';
end;
$$;

revoke all on function app_private.prevent_agentic_audit_mutation() from public, anon, authenticated, service_role;

create trigger agentic_audit_records_no_update_delete
before update or delete on app_private.agentic_audit_records
for each row execute function app_private.prevent_agentic_audit_mutation();
create trigger agentic_audit_records_no_truncate
before truncate on app_private.agentic_audit_records
for each statement execute function app_private.prevent_agentic_audit_mutation();
create trigger agentic_audit_checkpoints_no_update_delete
before update or delete on app_private.agentic_audit_checkpoints
for each row execute function app_private.prevent_agentic_audit_mutation();
create trigger agentic_audit_checkpoints_no_truncate
before truncate on app_private.agentic_audit_checkpoints
for each statement execute function app_private.prevent_agentic_audit_mutation();
create trigger agentic_audit_checkpoint_records_no_update_delete
before update or delete on app_private.agentic_audit_checkpoint_records
for each row execute function app_private.prevent_agentic_audit_mutation();
create trigger agentic_audit_checkpoint_records_no_truncate
before truncate on app_private.agentic_audit_checkpoint_records
for each statement execute function app_private.prevent_agentic_audit_mutation();

create index agentic_audit_checkpoints_workflow_idx on app_private.agentic_audit_checkpoints(workflow_id, persisted_at);
create index agentic_audit_checkpoints_correlation_idx on app_private.agentic_audit_checkpoints(correlation_id, persisted_at);
create index agentic_audit_records_correlation_idx on app_private.agentic_audit_records(correlation_id, sequence);

create or replace function public.persist_agentic_audit_checkpoint(p_checkpoint jsonb, p_context jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version integer;
  v_record_count integer;
  v_head_hash text;
  v_records jsonb;
  v_phase text;
  v_correlation_id text;
  v_workflow_id text;
  v_agent_id text;
  v_capability text;
  v_risk text;
  v_dedupe_key text;
  v_checkpoint_id uuid;
  v_persisted_at timestamptz;
  v_record jsonb;
  v_ordinal bigint;
  v_record_hash text;
  v_evidence_id text;
  v_previous_hash text := null;
  v_existing_hash text;
  v_last_hash text := null;
begin
  if jsonb_typeof(p_checkpoint) <> 'object' or jsonb_typeof(p_context) <> 'object' then
    raise exception 'checkpoint and context must be JSON objects';
  end if;

  v_version := nullif(p_checkpoint->>'version','')::integer;
  v_record_count := nullif(p_checkpoint->>'recordCount','')::integer;
  v_head_hash := p_checkpoint->>'headHash';
  v_records := p_checkpoint->'records';
  v_phase := p_context->>'phase';
  v_correlation_id := p_context->>'correlationId';
  v_workflow_id := p_context->>'workflowId';
  v_agent_id := p_context->>'agentId';
  v_capability := p_context->>'capability';
  v_risk := p_context->>'risk';

  if v_version <> 1 then raise exception 'unsupported checkpoint version'; end if;
  if v_record_count is null or v_record_count < 0 then raise exception 'invalid recordCount'; end if;
  if jsonb_typeof(v_records) <> 'array' or jsonb_array_length(v_records) <> v_record_count then
    raise exception 'recordCount does not match records';
  end if;
  if v_phase not in ('pre_execution','post_execution','pre_completion','verification_failed') then raise exception 'invalid audit phase'; end if;
  if coalesce(btrim(v_correlation_id),'') = '' or coalesce(btrim(v_workflow_id),'') = '' or coalesce(btrim(v_agent_id),'') = '' or coalesce(btrim(v_capability),'') = '' then
    raise exception 'missing audit context identity';
  end if;
  if v_risk not in ('read','write','privileged','destructive') then raise exception 'invalid risk'; end if;

  for v_record, v_ordinal in
    select value, ordinality - 1 from jsonb_array_elements(v_records) with ordinality
  loop
    if jsonb_typeof(v_record) <> 'object' then raise exception 'invalid evidence record'; end if;
    if nullif(v_record->>'sequence','')::integer <> v_ordinal::integer then raise exception 'invalid evidence sequence'; end if;
    if (v_record->>'previousHash') is distinct from v_previous_hash then raise exception 'invalid evidence hash chain'; end if;

    v_record_hash := v_record->>'hash';
    v_evidence_id := v_record->>'id';
    if coalesce(btrim(v_record_hash),'') = '' or coalesce(btrim(v_evidence_id),'') = '' then raise exception 'evidence id/hash required'; end if;
    if coalesce(btrim(v_record->>'correlationId'),'') = '' or coalesce(btrim(v_record->>'agentId'),'') = '' then raise exception 'evidence identity required'; end if;
    if (v_record->>'kind') not in ('request','admission','policy','approval','tool_call','tool_result','deployment_health','verification','workflow_transition','error') then raise exception 'invalid evidence kind'; end if;
    if jsonb_typeof(v_record->'payload') <> 'object' then raise exception 'evidence payload must be object'; end if;
    perform (v_record->>'occurredAt')::timestamptz;

    select record_hash into v_existing_hash
    from app_private.agentic_audit_records
    where evidence_id = v_evidence_id;
    if v_existing_hash is not null and v_existing_hash <> v_record_hash then
      raise exception 'evidence id reused with divergent hash';
    end if;

    insert into app_private.agentic_audit_records(
      record_hash, evidence_id, correlation_id, workflow_id, agent_id, kind, sequence, occurred_at, payload, previous_hash
    ) values (
      v_record_hash,
      v_evidence_id,
      v_record->>'correlationId',
      nullif(v_record->>'workflowId',''),
      v_record->>'agentId',
      v_record->>'kind',
      (v_record->>'sequence')::integer,
      (v_record->>'occurredAt')::timestamptz,
      v_record->'payload',
      nullif(v_record->>'previousHash','')
    ) on conflict (record_hash) do nothing;

    v_previous_hash := v_record_hash;
    v_last_hash := v_record_hash;
  end loop;

  if v_record_count = 0 then
    if v_head_hash is not null then raise exception 'empty checkpoint must have null headHash'; end if;
  elsif v_head_hash is distinct from v_last_hash then
    raise exception 'headHash does not match final evidence record';
  end if;

  v_dedupe_key := md5(concat_ws(E'\x1f', v_phase, v_correlation_id, v_workflow_id, v_agent_id, v_capability, v_risk, coalesce(v_head_hash,''), v_record_count::text));

  insert into app_private.agentic_audit_checkpoints(
    dedupe_key, phase, correlation_id, workflow_id, agent_id, capability, risk, head_hash, record_count
  ) values (
    v_dedupe_key, v_phase, v_correlation_id, v_workflow_id, v_agent_id, v_capability, v_risk, v_head_hash, v_record_count
  ) on conflict (dedupe_key) do nothing;

  select id, persisted_at into v_checkpoint_id, v_persisted_at
  from app_private.agentic_audit_checkpoints where dedupe_key = v_dedupe_key;

  insert into app_private.agentic_audit_checkpoint_records(checkpoint_id, ordinal, record_hash)
  select v_checkpoint_id, ordinality - 1, value->>'hash'
  from jsonb_array_elements(v_records) with ordinality
  on conflict do nothing;

  if (select count(*) from app_private.agentic_audit_checkpoint_records where checkpoint_id = v_checkpoint_id) <> v_record_count then
    raise exception 'persisted checkpoint record count mismatch';
  end if;

  return jsonb_build_object(
    'persistenceId', v_checkpoint_id::text,
    'headHash', v_head_hash,
    'recordCount', v_record_count,
    'persistedAt', to_char(v_persisted_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
end;
$$;

revoke all on function public.persist_agentic_audit_checkpoint(jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.persist_agentic_audit_checkpoint(jsonb,jsonb) to service_role;
