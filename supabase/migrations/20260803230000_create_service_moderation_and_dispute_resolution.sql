begin;

create table if not exists public.service_moderation_events (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.service_listings(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  from_status text,
  to_status text not null,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.service_moderation_events enable row level security;
create policy service_moderation_events_provider_read on public.service_moderation_events
for select to authenticated using (
  public.is_platform_staff()
  or exists (
    select 1 from public.service_listings listing
    where listing.id = listing_id and listing.provider_id = (select auth.uid())
  )
);
create policy service_moderation_events_staff_manage on public.service_moderation_events
for all to authenticated using (public.is_platform_staff()) with check (public.is_platform_staff());
grant select on public.service_moderation_events to authenticated;
grant all on public.service_moderation_events to service_role;

create or replace function app_private.review_service_listing_core(
  target_listing_id uuid,
  target_status text,
  target_reason text,
  target_actor_user_id uuid
)
returns public.service_listings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  listing public.service_listings;
  result public.service_listings;
begin
  if target_status not in ('approved', 'rejected') then raise exception 'Decisão de moderação inválida.'; end if;
  select * into listing from public.service_listings where id = target_listing_id for update;
  if listing.id is null then raise exception 'Serviço não encontrado.'; end if;
  if not exists (select 1 from public.service_packages where listing_id = listing.id and active) then
    raise exception 'O serviço precisa ter ao menos um pacote ativo.';
  end if;

  update public.service_listings
  set moderation_status = target_status,
      status = case when target_status = 'approved' then 'published' else 'draft' end,
      published_at = case when target_status = 'approved' then coalesce(published_at, now()) else published_at end,
      updated_at = now()
  where id = target_listing_id
  returning * into result;

  insert into public.service_moderation_events (listing_id, actor_user_id, from_status, to_status, reason)
  values (listing.id, target_actor_user_id, listing.moderation_status, target_status, nullif(trim(coalesce(target_reason, '')), ''));

  update public.commerce_offers offer
  set status = case when target_status = 'approved' and package.active then 'active' else 'draft' end,
      updated_at = now()
  from public.service_packages package
  where package.listing_id = listing.id
    and offer.resource_type = 'service'
    and offer.resource_id = package.id;

  return result;
end;
$$;

revoke all on function app_private.review_service_listing_core(uuid, text, text, uuid) from public;
grant execute on function app_private.review_service_listing_core(uuid, text, text, uuid) to authenticated, service_role;

create or replace function public.admin_review_service_listing(
  target_listing_id uuid,
  target_status text,
  target_reason text default null
)
returns public.service_listings
language plpgsql
security invoker
set search_path = public, app_private, pg_temp
as $$
begin
  if not public.is_platform_staff() then raise exception 'Permissão administrativa obrigatória.'; end if;
  return app_private.review_service_listing_core(target_listing_id, target_status, target_reason, (select auth.uid()));
end;
$$;

create or replace function public.admin_review_demo_service_listing(
  target_listing_id uuid,
  target_status text,
  target_reason text default null
)
returns public.service_listings
language plpgsql
security invoker
set search_path = public, app_private, pg_temp
as $$
begin
  if not exists (select 1 from public.service_listings where id = target_listing_id and is_demo) then raise exception 'Serviço demonstrativo inválido.'; end if;
  return app_private.review_service_listing_core(target_listing_id, target_status, target_reason, null);
end;
$$;

create or replace function app_private.resolve_service_dispute_core(
  target_dispute_id uuid,
  target_resolution_status text,
  target_refund_cents bigint,
  target_resolution text,
  target_actor_user_id uuid
)
returns public.service_disputes
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  dispute public.service_disputes;
  contract public.service_contracts;
  orders public.commerce_orders;
  refundable bigint;
  refund_amount bigint;
  delay_days integer;
  result public.service_disputes;
begin
  if target_resolution_status not in ('resolved_buyer', 'resolved_provider', 'resolved_split') then raise exception 'Resolução inválida.'; end if;
  select * into dispute from public.service_disputes where id = target_dispute_id for update;
  select * into contract from public.service_contracts where id = dispute.contract_id for update;
  select * into orders from public.commerce_orders where id = contract.order_id for update;
  if dispute.id is null or contract.id is null or orders.id is null then raise exception 'Disputa ou contrato não encontrado.'; end if;
  if dispute.status not in ('open', 'under_review') then raise exception 'A disputa já foi encerrada.'; end if;

  select greatest(0, payment.gross_amount_cents - payment.refunded_amount_cents - payment.chargeback_amount_cents)
  into refundable from public.payments payment
  where payment.order_id = orders.id order by payment.created_at desc limit 1;
  refundable := coalesce(refundable, 0);
  refund_amount := case
    when target_resolution_status = 'resolved_buyer' then refundable
    when target_resolution_status = 'resolved_provider' then 0
    else greatest(0, least(refundable, coalesce(target_refund_cents, 0)))
  end;

  if refund_amount > 0 then
    perform app_private.record_payment_adjustment(
      orders.id, 'refund', refund_amount, null,
      'service-dispute:' || dispute.id::text || ':' || refund_amount::text,
      coalesce(nullif(trim(target_resolution), ''), 'Resolução de disputa de serviço.'),
      jsonb_build_object('disputeId', dispute.id, 'resolutionStatus', target_resolution_status)
    );
  end if;

  delay_days := greatest(0, coalesce((public.resolve_commercial_parameter('financial.payout_delay_days')->>'value')::integer, 0));

  if target_resolution_status = 'resolved_buyer' then
    update public.service_contracts set status = 'refunded', completed_at = null where id = contract.id;
    update public.service_milestones set status = 'canceled' where contract_id = contract.id and status <> 'accepted';
    update public.commerce_entitlements set status = 'refunded', revoked_at = now()
    where order_item_id = contract.order_item_id and status = 'active';
  else
    update public.service_contracts set status = 'completed', completed_at = now() where id = contract.id;
    update public.service_milestones set status = 'accepted', accepted_at = coalesce(accepted_at, now())
    where contract_id = contract.id and status not in ('accepted', 'canceled');
    update public.revenue_splits
    set status = case when delay_days = 0 then 'available' else 'pending' end,
        available_at = now() + make_interval(days => delay_days)
    where order_item_id = contract.order_item_id and beneficiary_type = 'seller' and status = 'reserved';
  end if;

  update public.service_disputes
  set status = target_resolution_status,
      resolution = trim(target_resolution),
      resolved_by = target_actor_user_id,
      resolved_at = now(),
      updated_at = now()
  where id = dispute.id
  returning * into result;

  return result;
end;
$$;

revoke all on function app_private.resolve_service_dispute_core(uuid, text, bigint, text, uuid) from public;
grant execute on function app_private.resolve_service_dispute_core(uuid, text, bigint, text, uuid) to authenticated, service_role;

create or replace function public.admin_resolve_service_dispute(
  target_dispute_id uuid,
  target_resolution_status text,
  target_refund_cents bigint,
  target_resolution text
)
returns public.service_disputes
language plpgsql
security invoker
set search_path = public, app_private, pg_temp
as $$
begin
  if not public.is_platform_staff() then raise exception 'Permissão administrativa obrigatória.'; end if;
  return app_private.resolve_service_dispute_core(target_dispute_id, target_resolution_status, target_refund_cents, target_resolution, (select auth.uid()));
end;
$$;

create or replace function public.admin_resolve_demo_service_dispute(
  target_dispute_id uuid,
  target_resolution_status text,
  target_refund_cents bigint,
  target_resolution text
)
returns public.service_disputes
language plpgsql
security invoker
set search_path = public, app_private, pg_temp
as $$
begin
  if not exists (
    select 1 from public.service_disputes dispute
    join public.service_contracts contract on contract.id = dispute.contract_id
    where dispute.id = target_dispute_id and contract.is_demo
  ) then raise exception 'Disputa demonstrativa inválida.'; end if;
  return app_private.resolve_service_dispute_core(target_dispute_id, target_resolution_status, target_refund_cents, target_resolution, null);
end;
$$;

revoke all on function public.admin_review_service_listing(uuid, text, text) from public, anon;
grant execute on function public.admin_review_service_listing(uuid, text, text) to authenticated, service_role;
revoke all on function public.admin_review_demo_service_listing(uuid, text, text) from public;
grant execute on function public.admin_review_demo_service_listing(uuid, text, text) to anon, authenticated, service_role;
revoke all on function public.admin_resolve_service_dispute(uuid, text, bigint, text) from public, anon;
grant execute on function public.admin_resolve_service_dispute(uuid, text, bigint, text) to authenticated, service_role;
revoke all on function public.admin_resolve_demo_service_dispute(uuid, text, bigint, text) from public;
grant execute on function public.admin_resolve_demo_service_dispute(uuid, text, bigint, text) to anon, authenticated, service_role;

commit;
