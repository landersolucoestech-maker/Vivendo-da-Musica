create or replace function app_private.create_commerce_order(
  target_buyer_id uuid,
  target_offer_ids uuid[],
  target_context jsonb,
  target_idempotency_key text,
  target_is_demo boolean default false
)
returns public.commerce_orders
language plpgsql
security definer
set search_path = ''
as $function$
declare
  normalized_offer_ids uuid[];
  selected_count integer;
  currency_count integer;
  order_currency text;
  order_subtotal bigint;
  parameter_snapshot jsonb;
  platform_bps integer;
  existing_order public.commerce_orders;
  created_order public.commerce_orders;
  offer_row record;
  platform_amount bigint;
  seller_amount bigint;
  expected_snapshot jsonb;
begin
  if target_buyer_id is null then
    raise exception 'Buyer identity is required.' using errcode = '22023';
  end if;

  if target_idempotency_key is null
     or target_idempotency_key !~ '^[A-Za-z0-9:_-]{16,128}$' then
    raise exception 'Invalid checkout idempotency key.' using errcode = '22023';
  end if;

  if target_context is null then
    target_context := '{}'::jsonb;
  elsif jsonb_typeof(target_context) <> 'object' then
    raise exception 'Checkout context must be a JSON object.' using errcode = '22023';
  end if;

  if coalesce(cardinality(target_offer_ids), 0) < 1
     or cardinality(target_offer_ids) > 20
     or array_position(target_offer_ids, null) is not null then
    raise exception 'Checkout must contain between 1 and 20 valid offers.'
      using errcode = '22023';
  end if;

  select array_agg(value order by value)
  into normalized_offer_ids
  from (
    select distinct value
    from unnest(target_offer_ids) as input(value)
  ) normalized;

  if cardinality(normalized_offer_ids) <> cardinality(target_offer_ids) then
    raise exception 'Duplicate offers are not allowed.' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('commerce-checkout:' || target_idempotency_key, 0)
  );

  expected_snapshot := jsonb_build_object(
    'source', 'canonical_checkout',
    'offerIds', to_jsonb(normalized_offer_ids),
    'context', target_context
  );

  select *
  into existing_order
  from public.commerce_orders
  where idempotency_key = target_idempotency_key;

  if found then
    if existing_order.buyer_id is distinct from target_buyer_id
       or existing_order.is_demo is distinct from target_is_demo
       or existing_order.checkout_snapshot->'offerIds' is distinct from expected_snapshot->'offerIds'
       or existing_order.checkout_snapshot->'context' is distinct from target_context then
      raise exception 'Checkout idempotency key conflicts with another order.'
        using errcode = '23505';
    end if;

    return existing_order;
  end if;

  perform offer.id
  from public.commerce_offers offer
  where offer.id = any(normalized_offer_ids)
  order by offer.id
  for key share;

  perform price.id
  from public.commerce_offer_prices price
  where price.offer_id = any(normalized_offer_ids)
    and price.status = 'published'
    and price.effective_from <= now()
    and price.effective_until is null
  order by price.id
  for key share;

  select
    count(*)::integer,
    count(distinct price.currency)::integer,
    min(price.currency),
    coalesce(sum(price.amount_cents), 0)::bigint
  into
    selected_count,
    currency_count,
    order_currency,
    order_subtotal
  from public.commerce_offers offer
  join public.commerce_offer_prices price
    on price.offer_id = offer.id
   and price.status = 'published'
   and price.effective_from <= now()
   and price.effective_until is null
  where offer.id = any(normalized_offer_ids)
    and offer.status = 'active'
    and offer.is_demo = target_is_demo;

  if selected_count <> cardinality(normalized_offer_ids) then
    raise exception 'One or more offers are unavailable.' using errcode = 'P0001';
  end if;

  if currency_count <> 1 or order_currency !~ '^[A-Z]{3}$' then
    raise exception 'Checkout offers must use one valid currency.' using errcode = '22023';
  end if;

  if order_subtotal < 0 then
    raise exception 'Checkout total cannot be negative.' using errcode = '22003';
  end if;

  if exists (
    select 1
    from public.commerce_offers offer
    where offer.id = any(normalized_offer_ids)
      and offer.seller_id = target_buyer_id
  ) then
    raise exception 'A seller cannot purchase their own offer.' using errcode = '23514';
  end if;

  parameter_snapshot := public.resolve_commercial_parameter(
    'financial.default_platform_commission_bps'
  );
  platform_bps := greatest(
    0,
    least(10000, coalesce((parameter_snapshot->>'value')::integer, 0))
  );

  expected_snapshot := expected_snapshot || jsonb_build_object(
    'currency', order_currency,
    'subtotalCents', order_subtotal,
    'platformCommissionParameter', parameter_snapshot,
    'capturedAt', now()
  );

  insert into public.commerce_orders (
    buyer_id,
    status,
    currency,
    subtotal_cents,
    discount_cents,
    tax_cents,
    total_cents,
    idempotency_key,
    checkout_snapshot,
    is_demo
  ) values (
    target_buyer_id,
    'pending',
    order_currency,
    order_subtotal,
    0,
    0,
    order_subtotal,
    target_idempotency_key,
    expected_snapshot,
    target_is_demo
  )
  returning * into created_order;

  for offer_row in
    select
      offer.id as offer_id,
      offer.resource_type,
      offer.resource_id,
      offer.seller_id,
      offer.title,
      offer.metadata as offer_metadata,
      price.id as offer_price_id,
      price.amount_cents,
      price.currency,
      price.commercial_snapshot as price_snapshot
    from public.commerce_offers offer
    join public.commerce_offer_prices price
      on price.offer_id = offer.id
     and price.status = 'published'
     and price.effective_from <= now()
     and price.effective_until is null
    where offer.id = any(normalized_offer_ids)
    order by offer.id
  loop
    if offer_row.seller_id is null then
      platform_amount := offer_row.amount_cents;
      seller_amount := 0;
    else
      platform_amount := least(
        offer_row.amount_cents,
        round(offer_row.amount_cents::numeric * platform_bps / 10000)::bigint
      );
      seller_amount := offer_row.amount_cents - platform_amount;
    end if;

    insert into public.commerce_order_items (
      order_id,
      offer_id,
      offer_price_id,
      resource_type,
      resource_id,
      seller_id,
      title_snapshot,
      quantity,
      unit_amount_cents,
      gross_amount_cents,
      discount_cents,
      platform_commission_bps,
      platform_commission_cents,
      affiliate_id,
      affiliate_commission_bps,
      affiliate_commission_cents,
      seller_net_cents,
      commercial_snapshot
    ) values (
      created_order.id,
      offer_row.offer_id,
      offer_row.offer_price_id,
      offer_row.resource_type,
      offer_row.resource_id,
      offer_row.seller_id,
      offer_row.title,
      1,
      offer_row.amount_cents,
      offer_row.amount_cents,
      0,
      case when offer_row.seller_id is null then 10000 else platform_bps end,
      platform_amount,
      null,
      0,
      0,
      seller_amount,
      jsonb_build_object(
        'source', 'canonical_checkout',
        'offer', offer_row.offer_metadata,
        'price', offer_row.price_snapshot,
        'context', target_context,
        'platformCommissionParameter', parameter_snapshot
      )
    );
  end loop;

  insert into public.commerce_order_events (
    order_id,
    event_type,
    from_status,
    to_status,
    metadata
  ) values (
    created_order.id,
    'order_created',
    null,
    'pending',
    jsonb_build_object('source', 'canonical_checkout')
  );

  return created_order;
end;
$function$;

revoke all on function app_private.create_commerce_order(uuid, uuid[], jsonb, text, boolean)
from public, anon, authenticated, service_role;
grant execute on function app_private.create_commerce_order(uuid, uuid[], jsonb, text, boolean)
to service_role;

create or replace function public.service_create_commerce_order(
  target_buyer_id uuid,
  target_offer_ids uuid[],
  target_context jsonb,
  target_idempotency_key text,
  target_is_demo boolean default false
)
returns public.commerce_orders
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'Service role authorization is required.' using errcode = '42501';
  end if;

  return app_private.create_commerce_order(
    target_buyer_id,
    target_offer_ids,
    target_context,
    target_idempotency_key,
    target_is_demo
  );
end;
$function$;

revoke all on function public.service_create_commerce_order(uuid, uuid[], jsonb, text, boolean)
from public, anon, authenticated;
grant execute on function public.service_create_commerce_order(uuid, uuid[], jsonb, text, boolean)
to service_role;
