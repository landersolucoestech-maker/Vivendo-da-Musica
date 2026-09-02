alter table app_private.agentic_audit_checkpoints
  add column checkpoint_payload jsonb not null,
  add column context_payload jsonb not null,
  add column checkpoint_digest text not null check (checkpoint_digest ~ '^[0-9a-f]{64}$');

create unique index agentic_audit_checkpoints_digest_uidx
  on app_private.agentic_audit_checkpoints(checkpoint_digest);

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
  v_checkpoint_digest text;
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

  v_checkpoint_digest := encode(
    extensions.digest(
      convert_to(p_checkpoint::text || E'\x1f' || p_context::text, 'UTF8'),
      'sha256'
    ),
    'hex'
  );
  v_dedupe_key := v_checkpoint_digest;

  insert into app_private.agentic_audit_checkpoints(
    dedupe_key, phase, correlation_id, workflow_id, agent_id, capability, risk,
    head_hash, record_count, checkpoint_payload, context_payload, checkpoint_digest
  ) values (
    v_dedupe_key, v_phase, v_correlation_id, v_workflow_id, v_agent_id, v_capability, v_risk,
    v_head_hash, v_record_count, p_checkpoint, p_context, v_checkpoint_digest
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
    'persistedAt', to_char(v_persisted_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'checkpointDigest', v_checkpoint_digest
  );
end;
$$;

revoke all on function public.persist_agentic_audit_checkpoint(jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.persist_agentic_audit_checkpoint(jsonb,jsonb) to service_role;

create or replace function public.verify_agentic_audit_checkpoint(p_persistence_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_checkpoint app_private.agentic_audit_checkpoints%rowtype;
  v_expected_digest text;
  v_link_count integer;
  v_last_hash text;
begin
  select * into v_checkpoint
  from app_private.agentic_audit_checkpoints
  where id = p_persistence_id;

  if not found then raise exception 'audit checkpoint not found'; end if;

  v_expected_digest := encode(
    extensions.digest(
      convert_to(v_checkpoint.checkpoint_payload::text || E'\x1f' || v_checkpoint.context_payload::text, 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  select count(*)::integer into v_link_count
  from app_private.agentic_audit_checkpoint_records
  where checkpoint_id = p_persistence_id;

  select record_hash into v_last_hash
  from app_private.agentic_audit_checkpoint_records
  where checkpoint_id = p_persistence_id
  order by ordinal desc
  limit 1;

  return jsonb_build_object(
    'valid',
      v_expected_digest = v_checkpoint.checkpoint_digest
      and v_link_count = v_checkpoint.record_count
      and (
        (v_checkpoint.record_count = 0 and v_checkpoint.head_hash is null and v_last_hash is null)
        or (v_checkpoint.record_count > 0 and v_checkpoint.head_hash is not distinct from v_last_hash)
      ),
    'checkpointDigest', v_checkpoint.checkpoint_digest,
    'headHash', v_checkpoint.head_hash,
    'recordCount', v_checkpoint.record_count,
    'persistenceId', v_checkpoint.id::text
  );
end;
$$;

revoke all on function public.verify_agentic_audit_checkpoint(uuid) from public, anon, authenticated;
grant execute on function public.verify_agentic_audit_checkpoint(uuid) to service_role;
