begin;

create or replace function app_private.accept_service_proposal_core(
  target_request_id uuid,
  target_proposal_id uuid,
  target_buyer_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  request public.service_requests;
  proposal public.service_proposals;
  offer_id uuid;
begin
  select * into request from public.service_requests where id = target_request_id for update;
  select * into proposal from public.service_proposals where id = target_proposal_id and request_id = target_request_id for update;
  if request.id is null or proposal.id is null then raise exception 'Pedido ou proposta não encontrado.'; end if;
  if request.client_id <> target_buyer_id then raise exception 'Apenas o cliente pode escolher a proposta.'; end if;
  if request.status <> 'open' or proposal.status <> 'submitted' then raise exception 'Pedido ou proposta não está disponível.'; end if;

  update public.service_proposals
  set status = case when id = target_proposal_id then 'accepted' else 'rejected' end,
      updated_at = now()
  where request_id = target_request_id and status = 'submitted';

  update public.service_requests set status = 'proposal_selected', updated_at = now() where id = target_request_id;

  insert into public.commerce_offers (
    resource_type, resource_id, seller_id, title, description, status, currency, metadata, is_demo
  ) values (
    'service_proposal', proposal.id, proposal.provider_id, request.title, proposal.scope, 'active', proposal.currency,
    jsonb_build_object('requestId', request.id, 'proposalId', proposal.id, 'deliveryDays', proposal.delivery_days, 'revisions', proposal.revisions, 'deliverables', proposal.deliverables),
    request.is_demo
  )
  on conflict (resource_type, resource_id) do update
  set seller_id = excluded.seller_id,
      title = excluded.title,
      description = excluded.description,
      status = excluded.status,
      currency = excluded.currency,
      metadata = excluded.metadata,
      updated_at = now()
  returning id into offer_id;

  insert into public.commerce_offer_prices (
    offer_id, version, amount_cents, currency, status, effective_from, commercial_snapshot, published_at
  )
  select
    offer_id,
    coalesce(max(version), 0) + 1,
    proposal.amount_cents,
    proposal.currency,
    'published',
    now(),
    jsonb_build_object('source', 'service_proposal', 'requestId', request.id, 'proposalId', proposal.id, 'scope', proposal.scope, 'deliveryDays', proposal.delivery_days, 'revisions', proposal.revisions, 'deliverables', proposal.deliverables),
    now()
  from public.commerce_offer_prices
  where commerce_offer_prices.offer_id = accept_service_proposal_core.offer_id;

  return offer_id;
end;
$$;

revoke all on function app_private.accept_service_proposal_core(uuid, uuid, uuid) from public;
grant execute on function app_private.accept_service_proposal_core(uuid, uuid, uuid) to service_role;

create or replace function public.service_accept_service_proposal(
  target_request_id uuid,
  target_proposal_id uuid,
  target_buyer_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public, app_private, pg_temp
as $$
begin
  if (select auth.role()) <> 'service_role' then raise exception 'Acesso de serviço obrigatório.'; end if;
  return app_private.accept_service_proposal_core(target_request_id, target_proposal_id, target_buyer_id);
end;
$$;

revoke all on function public.service_accept_service_proposal(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.service_accept_service_proposal(uuid, uuid, uuid) to service_role;

create or replace function app_private.create_service_contract_from_entitlement()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  package public.service_packages;
  listing public.service_listings;
  proposal public.service_proposals;
  request public.service_requests;
  item public.commerce_order_items;
  contract_id uuid;
  provider_id uuid;
  listing_id uuid;
  package_id uuid;
  proposal_id uuid;
  title_snapshot text;
  scope_snapshot text;
  deliverables_snapshot text[];
  revisions integer;
  delivery_days integer;
  currency text;
begin
  if new.resource_type not in ('service', 'service_proposal') or new.status <> 'active' then return new; end if;
  select * into item from public.commerce_order_items where id = new.order_item_id;
  if item.id is null then return new; end if;

  if new.resource_type = 'service' then
    select * into package from public.service_packages where id = new.resource_id;
    select * into listing from public.service_listings where id = package.listing_id;
    if package.id is null or listing.id is null then return new; end if;
    provider_id := listing.provider_id;
    listing_id := listing.id;
    package_id := package.id;
    proposal_id := null;
    title_snapshot := listing.title || ' — ' || package.name;
    scope_snapshot := coalesce(package.description, listing.description);
    deliverables_snapshot := package.deliverables;
    revisions := package.revisions;
    delivery_days := package.delivery_days;
    currency := package.currency;
  else
    select * into proposal from public.service_proposals where id = new.resource_id;
    select * into request from public.service_requests where id = proposal.request_id;
    if proposal.id is null or request.id is null then return new; end if;
    provider_id := proposal.provider_id;
    listing_id := request.listing_id;
    package_id := null;
    proposal_id := proposal.id;
    title_snapshot := request.title;
    scope_snapshot := proposal.scope;
    deliverables_snapshot := proposal.deliverables;
    revisions := proposal.revisions;
    delivery_days := proposal.delivery_days;
    currency := proposal.currency;
  end if;

  insert into public.service_contracts (
    buyer_id, provider_id, listing_id, package_id, proposal_id, order_id, order_item_id,
    title_snapshot, scope_snapshot, deliverables_snapshot, revisions_included,
    total_cents, currency, status, due_at, is_demo
  ) values (
    new.user_id, provider_id, listing_id, package_id, proposal_id, new.order_id, new.order_item_id,
    title_snapshot, scope_snapshot, deliverables_snapshot, revisions,
    item.gross_amount_cents - item.discount_cents, currency, 'active',
    now() + make_interval(days => delivery_days), new.is_demo
  )
  on conflict (order_item_id) do update set order_item_id = excluded.order_item_id
  returning id into contract_id;

  insert into public.service_milestones (
    contract_id, title, description, amount_cents, currency, order_index, due_at, status
  ) values (
    contract_id, 'Entrega completa', scope_snapshot,
    item.gross_amount_cents - item.discount_cents, currency, 0,
    now() + make_interval(days => delivery_days), 'pending'
  )
  on conflict (contract_id, order_index) do nothing;

  if proposal_id is not null then
    update public.service_requests set status = 'contracted', updated_at = now() where id = request.id;
  end if;

  update public.revenue_splits
  set status = 'reserved', available_at = null
  where order_item_id = new.order_item_id
    and beneficiary_type in ('seller', 'affiliate');
  return new;
end;
$$;

revoke all on function app_private.create_service_contract_from_entitlement() from public, anon, authenticated;
grant execute on function app_private.create_service_contract_from_entitlement() to service_role;

commit;
