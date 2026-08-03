begin;

create or replace function app_private.upsert_commerce_offer(
  target_resource_type text,
  target_resource_id uuid,
  target_seller_id uuid,
  target_title text,
  target_description text,
  target_status text,
  target_currency text,
  target_amount_cents bigint,
  target_compare_at_cents bigint,
  target_is_demo boolean,
  target_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  canonical_offer_id uuid;
  current_price public.commerce_offer_prices;
  next_version integer;
  normalized_status text;
begin
  normalized_status := case
    when target_status = 'active' then 'active'
    when target_status = 'archived' then 'archived'
    else 'draft'
  end;

  insert into public.commerce_offers (
    resource_type, resource_id, seller_id, title, description, status, currency, metadata, is_demo
  ) values (
    target_resource_type,
    target_resource_id,
    target_seller_id,
    trim(target_title),
    nullif(trim(coalesce(target_description, '')), ''),
    normalized_status,
    upper(target_currency),
    coalesce(target_metadata, '{}'::jsonb),
    target_is_demo
  )
  on conflict (resource_type, resource_id) do update
  set seller_id = excluded.seller_id,
      title = excluded.title,
      description = excluded.description,
      status = excluded.status,
      currency = excluded.currency,
      metadata = public.commerce_offers.metadata || excluded.metadata,
      is_demo = excluded.is_demo,
      updated_at = now()
  returning id into canonical_offer_id;

  select price.*
  into current_price
  from public.commerce_offer_prices price
  where price.offer_id = canonical_offer_id
    and price.status = 'published'
    and price.effective_until is null
  order by price.version desc
  limit 1;

  if current_price.id is null
    or current_price.amount_cents is distinct from greatest(target_amount_cents, 0)
    or current_price.compare_at_cents is distinct from target_compare_at_cents
    or current_price.currency is distinct from upper(target_currency) then

    update public.commerce_offer_prices price
    set status = 'archived',
        effective_until = now()
    where price.offer_id = canonical_offer_id
      and price.status = 'published'
      and price.effective_until is null;

    select coalesce(max(price.version), 0) + 1
    into next_version
    from public.commerce_offer_prices price
    where price.offer_id = canonical_offer_id;

    insert into public.commerce_offer_prices (
      offer_id,
      version,
      amount_cents,
      compare_at_cents,
      currency,
      status,
      effective_from,
      commercial_snapshot,
      published_at
    ) values (
      canonical_offer_id,
      next_version,
      greatest(target_amount_cents, 0),
      case
        when target_compare_at_cents is not null
          and target_compare_at_cents >= greatest(target_amount_cents, 0)
        then target_compare_at_cents
        else null
      end,
      upper(target_currency),
      'published',
      now(),
      jsonb_build_object(
        'source', 'resource_sync',
        'resourceType', target_resource_type,
        'resourceId', target_resource_id,
        'capturedAt', now()
      ),
      now()
    );
  end if;

  return canonical_offer_id;
end;
$$;

revoke all on function app_private.upsert_commerce_offer(text,uuid,uuid,text,text,text,text,bigint,bigint,boolean,jsonb) from public, anon, authenticated;
grant execute on function app_private.upsert_commerce_offer(text,uuid,uuid,text,text,text,text,bigint,bigint,boolean,jsonb) to service_role;

commit;
