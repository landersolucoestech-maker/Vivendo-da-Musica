begin;

create or replace function app_private.sync_service_package_offer()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  listing public.service_listings;
begin
  select * into listing from public.service_listings where id = new.listing_id;
  if listing.id is null then return new; end if;

  perform app_private.upsert_commerce_offer(
    'service', new.id, listing.provider_id, listing.title || ' — ' || new.name,
    new.description,
    case
      when new.active and listing.status = 'published' and listing.moderation_status = 'approved' then 'active'
      when listing.status = 'archived' then 'archived'
      else 'draft'
    end,
    new.currency, new.price_cents, null, listing.is_demo,
    jsonb_build_object(
      'listingId', listing.id,
      'listingSlug', listing.slug,
      'deliveryDays', new.delivery_days,
      'revisions', new.revisions,
      'deliverables', new.deliverables
    )
  );
  return new;
end;
$$;

revoke all on function app_private.sync_service_package_offer() from public, anon, authenticated;

drop trigger if exists sync_service_package_commerce_offer on public.service_packages;
create trigger sync_service_package_commerce_offer
after insert or update of name, description, price_cents, currency, delivery_days, revisions, deliverables, active
on public.service_packages
for each row execute function app_private.sync_service_package_offer();

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
  if new.resource_type <> 'service' or new.status <> 'active' then return new; end if;

  select * into package from public.service_packages where id = new.resource_id;
  select * into listing from public.service_listings where id = package.listing_id;
  select * into item from public.commerce_order_items where id = new.order_item_id;
  if package.id is null or listing.id is null or item.id is null then return new; end if;

  insert into public.service_contracts (
    buyer_id, provider_id, listing_id, package_id, order_id, order_item_id,
    title_snapshot, scope_snapshot, deliverables_snapshot, revisions_included,
    total_cents, currency, status, due_at, is_demo
  ) values (
    new.user_id, listing.provider_id, listing.id, package.id, new.order_id, new.order_item_id,
    listing.title || ' — ' || package.name,
    coalesce(package.description, listing.description), package.deliverables, package.revisions,
    item.gross_amount_cents - item.discount_cents, package.currency, 'active',
    now() + make_interval(days => package.delivery_days), new.is_demo
  )
  on conflict (order_item_id) do update set order_item_id = excluded.order_item_id
  returning id into contract_id;

  insert into public.service_milestones (
    contract_id, title, description, amount_cents, currency, order_index, due_at, status
  ) values (
    contract_id, 'Entrega completa', coalesce(package.description, listing.description),
    item.gross_amount_cents - item.discount_cents, package.currency, 0,
    now() + make_interval(days => package.delivery_days), 'pending'
  )
  on conflict (contract_id, order_index) do nothing;

  update public.revenue_splits
  set status = 'reserved', available_at = null
  where order_item_id = new.order_item_id
    and beneficiary_type in ('seller', 'affiliate');

  return new;
end;
$$;

revoke all on function app_private.create_service_contract_from_entitlement() from public, anon, authenticated;
grant execute on function app_private.create_service_contract_from_entitlement() to service_role;

drop trigger if exists create_service_contract_on_entitlement on public.commerce_entitlements;
create trigger create_service_contract_on_entitlement
after insert or update of status on public.commerce_entitlements
for each row execute function app_private.create_service_contract_from_entitlement();

create or replace function app_private.submit_service_delivery_core(
  target_milestone_id uuid,
  target_provider_id uuid,
  target_notes text,
  target_file_paths jsonb
)
returns public.service_deliveries
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  milestone public.service_milestones;
  contract public.service_contracts;
  next_version integer;
  result public.service_deliveries;
begin
  select * into milestone from public.service_milestones where id = target_milestone_id for update;
  select * into contract from public.service_contracts where id = milestone.contract_id for update;
  if milestone.id is null or contract.id is null then raise exception 'Marco de serviço não encontrado.'; end if;
  if contract.provider_id <> target_provider_id then raise exception 'Apenas o prestador pode enviar a entrega.'; end if;
  if contract.status in ('completed', 'canceled', 'refunded') then raise exception 'Este contrato não aceita novas entregas.'; end if;

  select coalesce(max(version), 0) + 1 into next_version
  from public.service_deliveries where milestone_id = target_milestone_id;

  update public.service_deliveries set status = 'superseded'
  where milestone_id = target_milestone_id and status = 'submitted';

  insert into public.service_deliveries (
    milestone_id, submitted_by, notes, file_paths, version, status
  ) values (
    target_milestone_id, target_provider_id, nullif(trim(coalesce(target_notes, '')), ''),
    coalesce(target_file_paths, '[]'::jsonb), next_version, 'submitted'
  ) returning * into result;

  update public.service_milestones set status = 'submitted' where id = target_milestone_id;
  update public.service_contracts set status = 'delivery_submitted' where id = contract.id;
  return result;
end;
$$;

revoke all on function app_private.submit_service_delivery_core(uuid, uuid, text, jsonb) from public;
grant execute on function app_private.submit_service_delivery_core(uuid, uuid, text, jsonb) to authenticated, service_role;

create or replace function public.submit_service_delivery(
  target_milestone_id uuid,
  target_notes text,
  target_file_paths jsonb
)
returns public.service_deliveries
language plpgsql
security invoker
set search_path = public, app_private, pg_temp
as $$
begin
  if (select auth.uid()) is null then raise exception 'Autenticação obrigatória.'; end if;
  return app_private.submit_service_delivery_core(
    target_milestone_id, (select auth.uid()), target_notes, target_file_paths
  );
end;
$$;

revoke all on function public.submit_service_delivery(uuid, text, jsonb) from public, anon;
grant execute on function public.submit_service_delivery(uuid, text, jsonb) to authenticated, service_role;

create or replace function app_private.accept_service_milestone_core(
  target_milestone_id uuid,
  target_buyer_id uuid
)
returns public.service_milestones
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  milestone public.service_milestones;
  contract public.service_contracts;
  remaining integer;
  delay_days integer;
  result public.service_milestones;
begin
  select * into milestone from public.service_milestones where id = target_milestone_id for update;
  select * into contract from public.service_contracts where id = milestone.contract_id for update;
  if milestone.id is null or contract.id is null then raise exception 'Marco de serviço não encontrado.'; end if;
  if contract.buyer_id <> target_buyer_id then raise exception 'Apenas o contratante pode aceitar a entrega.'; end if;
  if milestone.status <> 'submitted' then raise exception 'Marco não está aguardando aceite.'; end if;

  update public.service_milestones
  set status = 'accepted', accepted_at = now()
  where id = target_milestone_id
  returning * into result;

  update public.service_deliveries
  set status = 'accepted', reviewed_at = now()
  where milestone_id = target_milestone_id and status = 'submitted';

  select count(*) into remaining
  from public.service_milestones
  where contract_id = contract.id and status <> 'accepted';

  if remaining = 0 then
    delay_days := greatest(
      0,
      coalesce((public.resolve_commercial_parameter('financial.payout_delay_days')->>'value')::integer, 0)
    );
    update public.service_contracts set status = 'completed', completed_at = now() where id = contract.id;
    update public.revenue_splits
    set status = case when delay_days = 0 then 'available' else 'pending' end,
        available_at = now() + make_interval(days => delay_days)
    where order_item_id = contract.order_item_id and status = 'reserved';
    update public.service_listings
    set completed_contracts = completed_contracts + 1
    where id = contract.listing_id;
  end if;
  return result;
end;
$$;

revoke all on function app_private.accept_service_milestone_core(uuid, uuid) from public;
grant execute on function app_private.accept_service_milestone_core(uuid, uuid) to authenticated, service_role;

create or replace function public.accept_service_milestone(target_milestone_id uuid)
returns public.service_milestones
language plpgsql
security invoker
set search_path = public, app_private, pg_temp
as $$
begin
  if (select auth.uid()) is null then raise exception 'Autenticação obrigatória.'; end if;
  return app_private.accept_service_milestone_core(target_milestone_id, (select auth.uid()));
end;
$$;

revoke all on function public.accept_service_milestone(uuid) from public, anon;
grant execute on function public.accept_service_milestone(uuid) to authenticated, service_role;

create or replace function app_private.open_service_dispute_core(
  target_contract_id uuid,
  target_opened_by uuid,
  target_reason text,
  target_description text
)
returns public.service_disputes
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  contract public.service_contracts;
  result public.service_disputes;
begin
  select * into contract from public.service_contracts where id = target_contract_id for update;
  if contract.id is null then raise exception 'Contrato não encontrado.'; end if;
  if target_opened_by not in (contract.buyer_id, contract.provider_id) then raise exception 'Usuário não participa deste contrato.'; end if;
  if contract.status in ('completed', 'canceled', 'refunded') then raise exception 'Este contrato não permite abertura de disputa.'; end if;

  insert into public.service_disputes (contract_id, opened_by, reason, description)
  values (target_contract_id, target_opened_by, trim(target_reason), trim(target_description))
  returning * into result;

  update public.service_contracts set status = 'disputed' where id = target_contract_id;
  update public.service_milestones set status = 'disputed'
  where contract_id = target_contract_id and status not in ('accepted', 'canceled');
  update public.revenue_splits set status = 'reserved', available_at = null
  where order_item_id = contract.order_item_id and status in ('pending', 'available');
  return result;
end;
$$;

revoke all on function app_private.open_service_dispute_core(uuid, uuid, text, text) from public;
grant execute on function app_private.open_service_dispute_core(uuid, uuid, text, text) to authenticated, service_role;

create or replace function public.open_service_dispute(
  target_contract_id uuid,
  target_reason text,
  target_description text
)
returns public.service_disputes
language plpgsql
security invoker
set search_path = public, app_private, pg_temp
as $$
begin
  if (select auth.uid()) is null then raise exception 'Autenticação obrigatória.'; end if;
  return app_private.open_service_dispute_core(
    target_contract_id, (select auth.uid()), target_reason, target_description
  );
end;
$$;

revoke all on function public.open_service_dispute(uuid, text, text) from public, anon;
grant execute on function public.open_service_dispute(uuid, text, text) to authenticated, service_role;

create or replace function app_private.refresh_service_listing_rating()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_listing_id uuid;
begin
  select contract.listing_id into target_listing_id
  from public.service_contracts contract
  where contract.id = coalesce(new.contract_id, old.contract_id);

  if target_listing_id is not null then
    update public.service_listings listing
    set rating_average = coalesce((
          select round(avg(review.rating)::numeric, 2)
          from public.service_reviews review
          join public.service_contracts contract on contract.id = review.contract_id
          where contract.listing_id = target_listing_id
            and review.reviewed_user_id = listing.provider_id
        ), 0),
        rating_count = (
          select count(*)
          from public.service_reviews review
          join public.service_contracts contract on contract.id = review.contract_id
          where contract.listing_id = target_listing_id
            and review.reviewed_user_id = listing.provider_id
        )
    where listing.id = target_listing_id;
  end if;
  return coalesce(new, old);
end;
$$;

revoke all on function app_private.refresh_service_listing_rating() from public, anon, authenticated;

drop trigger if exists refresh_service_listing_rating on public.service_reviews;
create trigger refresh_service_listing_rating
after insert or update or delete on public.service_reviews
for each row execute function app_private.refresh_service_listing_rating();

commit;
