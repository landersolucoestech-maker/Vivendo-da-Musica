create or replace function public.create_demo_beat_order(
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
  created_order public.beat_orders%rowtype;
  selected_count integer;
  selected_currency text;
  distinct_currency_count integer;
  order_total bigint;
  paid_timestamp timestamptz := clock_timestamp();
  buyer_name text;
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
  if cardinality(target_license_ids) <>
     (select count(distinct value) from unnest(target_license_ids) as ids(value)) then
    raise exception 'Duplicate licenses are not allowed' using errcode = '22023';
  end if;
  if not exists (
    select 1
    from public.user_profiles
    where user_id = target_buyer_id
      and is_demo = true
  ) then
    raise exception 'Buyer is not a demo profile' using errcode = '42501';
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
    if existing_order.buyer_id is distinct from target_buyer_id
       or existing_order.is_demo is not true then
      raise exception 'Idempotency key belongs to another checkout' using errcode = '42501';
    end if;
    return jsonb_build_object(
      'order_id', existing_order.id,
      'amount_cents', existing_order.amount_cents,
      'currency', existing_order.currency,
      'existing', true
    );
  end if;

  perform bl.id
  from public.beat_licenses bl
  join public.beats b on b.id = bl.beat_id
  where bl.id = any(target_license_ids)
  order by bl.id
  for update of bl, b;

  select count(*),
         min(upper(bl.currency)),
         count(distinct upper(bl.currency)),
         sum(bl.price_cents)::bigint
  into selected_count, selected_currency, distinct_currency_count, order_total
  from public.beat_licenses bl
  join public.beats b on b.id = bl.beat_id
  where bl.id = any(target_license_ids)
    and bl.available = true
    and b.is_demo = true
    and b.status = 'published'
    and (bl.is_exclusive is not true or b.exclusive_available = true)
    and bl.price_cents >= 0;

  if selected_count <> cardinality(target_license_ids) then
    raise exception 'One or more demo licenses are unavailable' using errcode = 'P0001';
  end if;
  if distinct_currency_count <> 1
     or selected_currency !~ '^[A-Z]{3}$' then
    raise exception 'Licenses must use one valid currency' using errcode = '22023';
  end if;
  if order_total is null or order_total < 0 or order_total > 2147483647 then
    raise exception 'Order total is out of range' using errcode = '22003';
  end if;

  select coalesce(nullif(trim(full_name), ''), 'Aluno de Desenvolvimento')
  into buyer_name
  from public.user_profiles
  where user_id = target_buyer_id;

  insert into public.beat_orders (
    buyer_id,
    status,
    provider,
    provider_reference,
    amount_cents,
    subtotal_cents,
    discount_cents,
    currency,
    is_demo
  ) values (
    target_buyer_id,
    'pending',
    'development',
    target_idempotency_key,
    order_total::integer,
    order_total::integer,
    0,
    selected_currency,
    true
  )
  returning * into created_order;

  insert into public.beat_order_items (
    order_id,
    beat_id,
    license_id,
    producer_id,
    buyer_id,
    beat_title_snapshot,
    license_name_snapshot,
    buyer_name_snapshot,
    list_price_cents,
    amount_cents,
    currency,
    status
  )
  select created_order.id,
         bl.beat_id,
         bl.id,
         b.producer_id,
         target_buyer_id,
         b.title,
         bl.name,
         buyer_name,
         bl.price_cents,
         bl.price_cents,
         upper(bl.currency),
         'pending'
  from public.beat_licenses bl
  join public.beats b on b.id = bl.beat_id
  where bl.id = any(target_license_ids);

  update public.beat_order_items
  set status = 'paid',
      paid_at = paid_timestamp
  where order_id = created_order.id;

  update public.beat_orders
  set status = 'paid',
      paid_at = paid_timestamp
  where id = created_order.id
  returning * into created_order;

  return jsonb_build_object(
    'order_id', created_order.id,
    'amount_cents', created_order.amount_cents,
    'currency', created_order.currency,
    'existing', false
  );
end;
$$;

create or replace function public.create_demo_course_order(
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
  created_order public.course_orders%rowtype;
  selected_count integer;
  selected_currency text;
  distinct_currency_count integer;
  order_total bigint;
  paid_timestamp timestamptz := clock_timestamp();
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
  if cardinality(target_course_ids) <>
     (select count(distinct value) from unnest(target_course_ids) as ids(value)) then
    raise exception 'Duplicate courses are not allowed' using errcode = '22023';
  end if;
  if not exists (
    select 1
    from public.user_profiles
    where user_id = target_buyer_id
      and is_demo = true
  ) then
    raise exception 'Buyer is not a demo profile' using errcode = '42501';
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
    if existing_order.user_id is distinct from target_buyer_id
       or existing_order.is_demo is not true then
      raise exception 'Idempotency key belongs to another checkout' using errcode = '42501';
    end if;
    return jsonb_build_object(
      'order_id', existing_order.id,
      'amount_cents', existing_order.amount_cents,
      'currency', existing_order.currency,
      'existing', true
    );
  end if;

  perform c.id
  from public.courses c
  where c.id = any(target_course_ids)
  order by c.id
  for key share;

  select count(*),
         min(upper(c.currency)),
         count(distinct upper(c.currency)),
         sum(c.price_cents)::bigint
  into selected_count, selected_currency, distinct_currency_count, order_total
  from public.courses c
  where c.id = any(target_course_ids)
    and c.status = 'published'
    and c.is_demo = true
    and c.price_cents >= 0;

  if selected_count <> cardinality(target_course_ids) then
    raise exception 'One or more demo courses are unavailable' using errcode = 'P0001';
  end if;
  if distinct_currency_count <> 1
     or selected_currency !~ '^[A-Z]{3}$' then
    raise exception 'Courses must use one valid currency' using errcode = '22023';
  end if;
  if order_total is null or order_total < 0 or order_total > 2147483647 then
    raise exception 'Order total is out of range' using errcode = '22003';
  end if;

  insert into public.course_orders (
    user_id,
    status,
    provider,
    provider_reference,
    amount_cents,
    currency,
    is_demo
  ) values (
    target_buyer_id,
    'pending',
    'development',
    target_idempotency_key,
    order_total::integer,
    selected_currency,
    true
  )
  returning * into created_order;

  insert into public.course_order_items (
    order_id,
    course_id,
    course_title_snapshot,
    amount_cents,
    currency
  )
  select created_order.id,
         c.id,
         c.title,
         c.price_cents,
         upper(c.currency)
  from public.courses c
  where c.id = any(target_course_ids);

  update public.course_orders
  set status = 'paid',
      paid_at = paid_timestamp
  where id = created_order.id
  returning * into created_order;

  return jsonb_build_object(
    'order_id', created_order.id,
    'amount_cents', created_order.amount_cents,
    'currency', created_order.currency,
    'existing', false
  );
end;
$$;

create or replace function public.create_demo_digital_product_order(
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
  created_order public.digital_product_orders%rowtype;
  selected_count integer;
  selected_currency text;
  distinct_currency_count integer;
  order_total bigint;
  paid_timestamp timestamptz := clock_timestamp();
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
  if cardinality(target_product_ids) <>
     (select count(distinct value) from unnest(target_product_ids) as ids(value)) then
    raise exception 'Duplicate products are not allowed' using errcode = '22023';
  end if;
  if not exists (
    select 1
    from public.user_profiles
    where user_id = target_buyer_id
      and is_demo = true
  ) then
    raise exception 'Buyer is not a demo profile' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('demo-product:' || target_idempotency_key, 0)
  );

  select *
  into existing_order
  from public.digital_product_orders
  where (provider = 'development' and provider_reference = target_idempotency_key)
     or idempotency_key = target_idempotency_key
  limit 1;

  if found then
    if existing_order.buyer_id is distinct from target_buyer_id
       or existing_order.is_demo is not true
       or existing_order.provider <> 'development' then
      raise exception 'Idempotency key belongs to another checkout' using errcode = '42501';
    end if;
    return jsonb_build_object(
      'order_id', existing_order.id,
      'amount_cents', existing_order.amount_cents,
      'currency', existing_order.currency,
      'existing', true
    );
  end if;

  perform p.id
  from public.seller_products p
  where p.id = any(target_product_ids)
  order by p.id
  for key share;

  select count(*),
         min(upper(p.currency)),
         count(distinct upper(p.currency)),
         sum(p.price_cents)::bigint
  into selected_count, selected_currency, distinct_currency_count, order_total
  from public.seller_products p
  where p.id = any(target_product_ids)
    and p.status = 'published'
    and p.is_demo = true
    and p.seller_id <> target_buyer_id
    and p.price_cents >= 0;

  if selected_count <> cardinality(target_product_ids) then
    raise exception 'One or more demo products are unavailable' using errcode = 'P0001';
  end if;
  if distinct_currency_count <> 1
     or selected_currency !~ '^[A-Z]{3}$' then
    raise exception 'Products must use one valid currency' using errcode = '22023';
  end if;
  if order_total is null or order_total < 0 or order_total > 2147483647 then
    raise exception 'Order total is out of range' using errcode = '22003';
  end if;

  insert into public.digital_product_orders (
    buyer_id,
    status,
    provider,
    provider_reference,
    idempotency_key,
    amount_cents,
    currency,
    is_demo
  ) values (
    target_buyer_id,
    'pending',
    'development',
    target_idempotency_key,
    target_idempotency_key,
    order_total::integer,
    selected_currency,
    true
  )
  returning * into created_order;

  insert into public.digital_product_order_items (
    order_id,
    product_id,
    seller_id,
    buyer_id,
    product_title_snapshot,
    amount_cents,
    currency,
    status
  )
  select created_order.id,
         p.id,
         p.seller_id,
         target_buyer_id,
         p.title,
         p.price_cents,
         upper(p.currency),
         'pending'
  from public.seller_products p
  where p.id = any(target_product_ids);

  update public.digital_product_order_items
  set status = 'paid',
      paid_at = paid_timestamp
  where order_id = created_order.id;

  update public.digital_product_orders
  set status = 'paid',
      paid_at = paid_timestamp
  where id = created_order.id
  returning * into created_order;

  return jsonb_build_object(
    'order_id', created_order.id,
    'amount_cents', created_order.amount_cents,
    'currency', created_order.currency,
    'existing', false
  );
end;
$$;

revoke all on function public.create_demo_beat_order(uuid, uuid[], text) from public, anon, authenticated;
revoke all on function public.create_demo_course_order(uuid, uuid[], text) from public, anon, authenticated;
revoke all on function public.create_demo_digital_product_order(uuid, uuid[], text) from public, anon, authenticated;

grant execute on function public.create_demo_beat_order(uuid, uuid[], text) to service_role;
grant execute on function public.create_demo_course_order(uuid, uuid[], text) to service_role;
grant execute on function public.create_demo_digital_product_order(uuid, uuid[], text) to service_role;

comment on function public.create_demo_beat_order(uuid, uuid[], text)
is 'Atomically creates a paid demonstration beat order and triggers license delivery issuance. Service role only.';
comment on function public.create_demo_course_order(uuid, uuid[], text)
is 'Atomically creates a paid demonstration course order and grants enrollments through existing triggers. Service role only.';
comment on function public.create_demo_digital_product_order(uuid, uuid[], text)
is 'Atomically creates a paid demonstration digital product order. Service role only.';
