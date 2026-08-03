begin;

create policy service_requests_demo_read on public.service_requests
for select to anon using (is_demo);

create policy service_proposals_demo_read on public.service_proposals
for select to anon using (
  exists (select 1 from public.service_requests request where request.id = request_id and request.is_demo)
);

create policy service_contracts_demo_read on public.service_contracts
for select to anon using (is_demo);

create policy service_milestones_demo_read on public.service_milestones
for select to anon using (
  exists (select 1 from public.service_contracts contract where contract.id = contract_id and contract.is_demo)
);

create policy service_deliveries_demo_read on public.service_deliveries
for select to anon using (
  exists (
    select 1
    from public.service_milestones milestone
    join public.service_contracts contract on contract.id = milestone.contract_id
    where milestone.id = milestone_id and contract.is_demo
  )
);

create policy service_disputes_demo_read on public.service_disputes
for select to anon using (
  exists (select 1 from public.service_contracts contract where contract.id = contract_id and contract.is_demo)
);

create policy service_messages_demo_read on public.service_messages
for select to anon using (
  exists (select 1 from public.service_contracts contract where contract.id = contract_id and contract.is_demo)
);

grant select on public.service_requests, public.service_proposals, public.service_contracts,
  public.service_milestones, public.service_deliveries, public.service_disputes,
  public.service_messages to anon;

create or replace function public.submit_demo_service_delivery(
  target_milestone_id uuid,
  target_provider_id uuid,
  target_notes text,
  target_file_paths jsonb
)
returns public.service_deliveries
language plpgsql
security invoker
set search_path = public, app_private, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.service_milestones milestone
    join public.service_contracts contract on contract.id = milestone.contract_id
    join public.user_profiles provider on provider.user_id = contract.provider_id
    where milestone.id = target_milestone_id
      and contract.provider_id = target_provider_id
      and contract.is_demo
      and provider.is_demo
  ) then
    raise exception 'Contrato demonstrativo inválido.';
  end if;

  return app_private.submit_service_delivery_core(
    target_milestone_id,
    target_provider_id,
    target_notes,
    target_file_paths
  );
end;
$$;

create or replace function public.accept_demo_service_milestone(
  target_milestone_id uuid,
  target_buyer_id uuid
)
returns public.service_milestones
language plpgsql
security invoker
set search_path = public, app_private, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.service_milestones milestone
    join public.service_contracts contract on contract.id = milestone.contract_id
    join public.user_profiles buyer on buyer.user_id = contract.buyer_id
    where milestone.id = target_milestone_id
      and contract.buyer_id = target_buyer_id
      and contract.is_demo
      and buyer.is_demo
  ) then
    raise exception 'Contrato demonstrativo inválido.';
  end if;

  return app_private.accept_service_milestone_core(target_milestone_id, target_buyer_id);
end;
$$;

create or replace function public.open_demo_service_dispute(
  target_contract_id uuid,
  target_opened_by uuid,
  target_reason text,
  target_description text
)
returns public.service_disputes
language plpgsql
security invoker
set search_path = public, app_private, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.service_contracts contract
    join public.user_profiles profile on profile.user_id = target_opened_by
    where contract.id = target_contract_id
      and target_opened_by in (contract.buyer_id, contract.provider_id)
      and contract.is_demo
      and profile.is_demo
  ) then
    raise exception 'Contrato demonstrativo inválido.';
  end if;

  return app_private.open_service_dispute_core(
    target_contract_id,
    target_opened_by,
    target_reason,
    target_description
  );
end;
$$;

revoke all on function public.submit_demo_service_delivery(uuid, uuid, text, jsonb) from public;
grant execute on function public.submit_demo_service_delivery(uuid, uuid, text, jsonb) to anon, authenticated, service_role;
revoke all on function public.accept_demo_service_milestone(uuid, uuid) from public;
grant execute on function public.accept_demo_service_milestone(uuid, uuid) to anon, authenticated, service_role;
revoke all on function public.open_demo_service_dispute(uuid, uuid, text, text) from public;
grant execute on function public.open_demo_service_dispute(uuid, uuid, text, text) to anon, authenticated, service_role;

commit;
