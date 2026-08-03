begin;

create or replace function app_private.create_service_contract_from_entitlement()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  package public.service_packages;
  listing public.service_listings;
  item public.commerce_order_items;
  contract_id uuid;
begin
  if new.resource_type <> 'service' or new.status <> 'active' then
    return new;
  end if;

  select * into package from public.service_packages where id = new.resource_id;
  select * into listing from public.service_listings where id = package.listing_id;
  select * into item from public.commerce_order_items where id = new.order_item_id;

  if package.id is null or listing.id is null or item.id is null then
    return new;
  end if;

  insert into public.service_contracts (
    buyer_id, provider_id, listing_id, package_id, order_id, order_item_id,
    title_snapshot, scope_snapshot, deliverables_snapshot, revisions_included,
    total_cents, currency, status, due_at, is_demo
  ) values (
    new.user_id,
    listing.provider_id,
    listing.id,
    package.id,
    new.order_id,
    new.order_item_id,
    listing.title || ' — ' || package.name,
    coalesce(package.description, listing.description),
    package.deliverables,
    package.revisions,
    item.gross_amount_cents - item.discount_cents,
    package.currency,
    'active',
    now() + make_interval(days => package.delivery_days),
    new.is_demo
  )
  on conflict (order_item_id) do update
  set order_item_id = excluded.order_item_id
  returning id into contract_id;

  insert into public.service_milestones (
    contract_id, title, description, amount_cents, currency, order_index, due_at, status
  ) values (
    contract_id,
    'Entrega completa',
    coalesce(package.description, listing.description),
    item.gross_amount_cents - item.discount_cents,
    package.currency,
    0,
    now() + make_interval(days => package.delivery_days),
    'pending'
  )
  on conflict (contract_id, order_index) do nothing;

  update public.revenue_splits
  set status = 'reserved',
      available_at = null
  where order_item_id = new.order_item_id
    and beneficiary_type in ('seller', 'affiliate');

  return new;
end;
$$;

revoke all on function app_private.create_service_contract_from_entitlement() from public, anon, authenticated;
grant execute on function app_private.create_service_contract_from_entitlement() to service_role;

commit;
