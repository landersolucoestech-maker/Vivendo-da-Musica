alter function public.create_demo_beat_order(uuid, uuid[], text)
  set schema app_private;
alter function app_private.create_demo_beat_order(uuid, uuid[], text)
  rename to create_demo_beat_order_unchecked;

alter function public.create_demo_course_order(uuid, uuid[], text)
  set schema app_private;
alter function app_private.create_demo_course_order(uuid, uuid[], text)
  rename to create_demo_course_order_unchecked;

alter function public.create_demo_digital_product_order(uuid, uuid[], text)
  set schema app_private;
alter function app_private.create_demo_digital_product_order(uuid, uuid[], text)
  rename to create_demo_digital_product_order_unchecked;

revoke all on function app_private.create_demo_beat_order_unchecked(uuid, uuid[], text)
  from public, anon, authenticated, service_role;
revoke all on function app_private.create_demo_course_order_unchecked(uuid, uuid[], text)
  from public, anon, authenticated, service_role;
revoke all on function app_private.create_demo_digital_product_order_unchecked(uuid, uuid[], text)
  from public, anon, authenticated, service_role;

grant execute on function app_private.create_demo_beat_order_unchecked(uuid, uuid[], text)
  to postgres;
grant execute on function app_private.create_demo_course_order_unchecked(uuid, uuid[], text)
  to postgres;
grant execute on function app_private.create_demo_digital_product_order_unchecked(uuid, uuid[], text)
  to postgres;

create function public.create_demo_beat_order(
  target_buyer_id uuid,
  target_license_ids uuid[],
  target_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_order public.beat_orders%rowtype;
  requested_items uuid[];
  existing_items uuid[];
begin
  if target_buyer_id is null then
    raise exception 'Demo buyer is required' using errcode = '22023';
  end if;
  if target_idempotency_key is null
     or target_idempotency_key !~ '^[A-Za-z0-9:_-]{16,128}$' then
    raise exception 'Invalid idempotency key' using errcode = '22023';
  end if;
  if coalesce(cardinality(target_license_ids), 0) < 1
     or cardinality(target_license_ids) > 20 then
    raise exception 'Choose between 1 and 20 licenses' using errcode = '22023';
  end if;
  if array_position(target_license_ids, null) is not null then
    raise exception 'License identifiers cannot be null' using errcode = '22023';
  end if;

  select array_agg(value order by value), count(distinct value)
  into requested_items, strict _distinct_count
  from unnest(target_license_ids) as ids(value);

  if cardinality(target_license_ids) <> _distinct_count then
    raise exception 'Duplicate licenses are not allowed' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('demo-beat:' || target_idempotency_key, 0)
  );

  select *
  into existing_order
  from public.beat_orders
  where provider = 'development'
    and provider_reference = target_idempotency_key;

  if found then
    select coalesce(array_agg(license_id order by license_id), '{}'::uuid[])
    into existing_items
    from public.beat_order_items
    where order_id = existing_order.id;

    if existing_order.buyer_id is distinct from target_buyer_id
       or existing_order.is_demo is not true
       or existing_order.status <> 'paid'
       or existing_items is distinct from requested_items then
      raise exception 'Idempotency key conflicts with another checkout'
        using errcode = '23505';
    end if;

    return jsonb_build_object(
      'order_id', existing_order.id,
      'amount_cents', existing_order.amount_cents,
      'currency', existing_order.currency,
      'existing', true
    );
  end if;

  return app_private.create_demo_beat_order_unchecked(
    target_buyer_id,
    target_license_ids,
    target_idempotency_key
  );
end;
$$;

create function public.create_demo_course_order(
  target_buyer_id uuid,
  target_course_ids uuid[],
  target_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_order public.course_orders%rowtype;
  requested_items uuid[];
  existing_items uuid[];
  distinct_count integer;
begin
  if target_buyer_id is null then
    raise exception 'Demo buyer is required' using errcode = '22023';
  end if;
  if target_idempotency_key is null
     or target_idempotency_key !~ '^[A-Za-z0-9:_-]{16,128}$' then
    raise exception 'Invalid idempotency key' using errcode = '22023';
  end if;
  if coalesce(cardinality(target_course_ids), 0) < 1
     or cardinality(target_course_ids) > 20 then
    raise exception 'Choose between 1 and 20 courses' using errcode = '22023';
  end if;
  if array_position(target_course_ids, null) is not null then
    raise exception 'Course identifiers cannot be null' using errcode = '22023';
  end if;

  select array_agg(value order by value), count(distinct value)
  into requested_items, distinct_count
  from unnest(target_course_ids) as ids(value);

  if cardinality(target_course_ids) <> distinct_count then
    raise exception 'Duplicate courses are not allowed' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('demo-course:' || target_idempotency_key, 0)
  );

  select *
  into existing_order
  from public.course_orders
  where provider = 'development'
    and provider_reference = target_idempotency_key;

  if found then
    select coalesce(array_agg(course_id order by course_id), '{}'::uuid[])
    into existing_items
    from public.course_order_items
    where order_id = existing_order.id;

    if existing_order.user_id is distinct from target_buyer_id
       or existing_order.is_demo is not true
       or existing_order.status <> 'paid'
       or existing_items is distinct from requested_items then
      raise exception 'Idempotency key conflicts with another checkout'
        using errcode = '23505';
    end if;

    return jsonb_build_object(
      'order_id', existing_order.id,
      'amount_cents', existing_order.amount_cents,
      'currency', existing_order.currency,
      'existing', true
    );
  end if;

  return app_private.create_demo_course_order_unchecked(
    target_buyer_id,
    target_course_ids,
    target_idempotency_key
  );
end;
$$;

create function public.create_demo_digital_product_order(
  target_buyer_id uuid,
  target_product_ids uuid[],
  target_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_order public.digital_product_orders%rowtype;
  requested_items uuid[];
  existing_items uuid[];
  distinct_count integer;
begin
  if target_buyer_id is null then
    raise exception 'Demo buyer is required' using errcode = '22023';
  end if;
  if target_idempotency_key is null
     or target_idempotency_key !~ '^[A-Za-z0-9:_-]{16,128}$' then
    raise exception 'Invalid idempotency key' using errcode = '22023';
  end if;
  if coalesce(cardinality(target_product_ids), 0) < 1
     or cardinality(target_product_ids) > 20 then
    raise exception 'Choose between 1 and 20 products' using errcode = '22023';
  end if;
  if array_position(target_product_ids, null) is not null then
    raise exception 'Product identifiers cannot be null' using errcode = '22023';
  end if;

  select array_agg(value order by value), count(distinct value)
  into requested_items, distinct_count
  from unnest(target_product_ids) as ids(value);

  if cardinality(target_product_ids) <> distinct_count then
    raise exception 'Duplicate products are not allowed' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('demo-product:' || target_idempotency_key, 0)
  );

  select *
  into existing_order
  from public.digital_product_orders
  where idempotency_key = target_idempotency_key
     or (provider = 'development' and provider_reference = target_idempotency_key)
  order by id
  limit 1;

  if found then
    select coalesce(array_agg(product_id order by product_id), '{}'::uuid[])
    into existing_items
    from public.digital_product_order_items
    where order_id = existing_order.id;

    if existing_order.buyer_id is distinct from target_buyer_id
       or existing_order.is_demo is not true
       or existing_order.provider <> 'development'
       or existing_order.status <> 'paid'
       or existing_items is distinct from requested_items then
      raise exception 'Idempotency key conflicts with another checkout'
        using errcode = '23505';
    end if;

    return jsonb_build_object(
      'order_id', existing_order.id,
      'amount_cents', existing_order.amount_cents,
      'currency', existing_order.currency,
      'existing', true
    );
  end if;

  return app_private.create_demo_digital_product_order_unchecked(
    target_buyer_id,
    target_product_ids,
    target_idempotency_key
  );
end;
$$;

revoke all on function public.create_demo_beat_order(uuid, uuid[], text)
  from public, anon, authenticated;
revoke all on function public.create_demo_course_order(uuid, uuid[], text)
  from public, anon, authenticated;
revoke all on function public.create_demo_digital_product_order(uuid, uuid[], text)
  from public, anon, authenticated;

grant execute on function public.create_demo_beat_order(uuid, uuid[], text)
  to service_role;
grant execute on function public.create_demo_course_order(uuid, uuid[], text)
  to service_role;
grant execute on function public.create_demo_digital_product_order(uuid, uuid[], text)
  to service_role;

comment on function public.create_demo_beat_order(uuid, uuid[], text)
is 'Creates or safely replays an atomic paid demonstration beat order. Service role only.';
comment on function public.create_demo_course_order(uuid, uuid[], text)
is 'Creates or safely replays an atomic paid demonstration course order. Service role only.';
comment on function public.create_demo_digital_product_order(uuid, uuid[], text)
is 'Creates or safely replays an atomic paid demonstration product order. Service role only.';
