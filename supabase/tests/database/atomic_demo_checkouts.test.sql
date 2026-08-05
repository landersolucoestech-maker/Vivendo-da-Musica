begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

select ok(
  to_regprocedure('public.create_demo_beat_order(uuid,uuid[],text)') is not null
  and to_regprocedure('public.create_demo_course_order(uuid,uuid[],text)') is not null
  and to_regprocedure('public.create_demo_digital_product_order(uuid,uuid[],text)') is not null,
  'all atomic demo checkout RPCs exist'
);

select ok(
  has_function_privilege('service_role', 'public.create_demo_beat_order(uuid,uuid[],text)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.create_demo_course_order(uuid,uuid[],text)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.create_demo_digital_product_order(uuid,uuid[],text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.create_demo_beat_order(uuid,uuid[],text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.create_demo_course_order(uuid,uuid[],text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.create_demo_digital_product_order(uuid,uuid[],text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.create_demo_beat_order(uuid,uuid[],text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.create_demo_course_order(uuid,uuid[],text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.create_demo_digital_product_order(uuid,uuid[],text)', 'EXECUTE'),
  'atomic demo checkout RPCs are service-role only'
);

select ok(
  (
    select count(*) = 3
      and bool_and(p.prosecdef)
      and bool_and(coalesce(p.proconfig, '{}'::text[]) @> array['search_path=""'])
      and bool_and(position('pg_advisory_xact_lock' in pg_get_functiondef(p.oid)) > 0)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'create_demo_beat_order',
        'create_demo_course_order',
        'create_demo_digital_product_order'
      )
  ),
  'atomic demo checkout RPCs are hardened definers with transaction locks'
);

create temporary table demo_checkout_test_state (
  kind text primary key,
  item_id uuid not null,
  idempotency_key text not null,
  order_id uuid,
  replay_result jsonb
) on commit drop;

insert into demo_checkout_test_state (kind, item_id, idempotency_key)
select 'beat', bl.id, 'pgtap-demo-beat-atomic-0001'
from public.beat_licenses bl
join public.beats b on b.id = bl.beat_id
where bl.available = true
  and b.is_demo = true
  and b.status = 'published'
  and b.master_file_path is not null
order by bl.is_exclusive, bl.id
limit 1;

insert into demo_checkout_test_state (kind, item_id, idempotency_key)
select 'course', c.id, 'pgtap-demo-course-atomic-0001'
from public.courses c
where c.is_demo = true
  and c.status = 'published'
order by c.id
limit 1;

insert into demo_checkout_test_state (kind, item_id, idempotency_key)
select 'product', p.id, 'pgtap-demo-product-atomic-0001'
from public.seller_products p
where p.is_demo = true
  and p.status = 'published'
  and p.seller_id <> '11111111-1111-4111-8111-111111111111'::uuid
order by p.id
limit 1;

select lives_ok(
  $test$
    select public.create_demo_beat_order(
      '11111111-1111-4111-8111-111111111111'::uuid,
      array[(select item_id from demo_checkout_test_state where kind = 'beat')],
      'pgtap-demo-beat-atomic-0001'
    )
  $test$,
  'demo beat checkout completes atomically'
);

update demo_checkout_test_state
set order_id = (
  select id from public.beat_orders
  where provider = 'development'
    and provider_reference = demo_checkout_test_state.idempotency_key
)
where kind = 'beat';

select ok(
  (
    select status = 'paid'
      and provider = 'development'
      and is_demo = true
      and paid_at is not null
      and amount_cents = subtotal_cents
    from public.beat_orders
    where id = (select order_id from demo_checkout_test_state where kind = 'beat')
  ),
  'demo beat order is paid, isolated and internally balanced'
);

select ok(
  (
    select count(*) = 1
      and bool_and(status = 'paid')
      and bool_and(paid_at is not null)
      and bool_and(list_price_cents = amount_cents)
    from public.beat_order_items
    where order_id = (select order_id from demo_checkout_test_state where kind = 'beat')
  ),
  'demo beat order item is paid with a complete price snapshot'
);

select ok(
  exists (
    select 1
    from public.beat_license_purchases purchase
    join public.beat_order_items item
      on item.id = purchase.order_item_id
    where item.order_id = (select order_id from demo_checkout_test_state where kind = 'beat')
      and purchase.status = 'active'
      and length(purchase.contract_hash) = 64
  ),
  'paid demo beat order issues an active hashed license contract'
);

select ok(
  exists (
    select 1
    from public.beat_deliveries delivery
    join public.beat_license_purchases purchase
      on purchase.id = delivery.purchase_id
    join public.beat_order_items item
      on item.id = purchase.order_item_id
    where item.order_id = (select order_id from demo_checkout_test_state where kind = 'beat')
      and delivery.storage_bucket = 'beat-masters'
      and delivery.expires_at > now()
  ),
  'paid demo beat order issues a time-limited master delivery'
);

update demo_checkout_test_state
set replay_result = public.create_demo_beat_order(
  '11111111-1111-4111-8111-111111111111'::uuid,
  array[item_id],
  idempotency_key
)
where kind = 'beat';

select ok(
  (
    select (replay_result ->> 'existing')::boolean
      and (replay_result ->> 'order_id')::uuid = order_id
    from demo_checkout_test_state
    where kind = 'beat'
  ),
  'demo beat checkout reuses the idempotent order'
);

select is(
  (
    select count(*)::integer
    from public.beat_orders
    where provider = 'development'
      and provider_reference = 'pgtap-demo-beat-atomic-0001'
  ),
  1,
  'demo beat idempotency creates exactly one order'
);

select lives_ok(
  $test$
    select public.create_demo_course_order(
      '11111111-1111-4111-8111-111111111111'::uuid,
      array[(select item_id from demo_checkout_test_state where kind = 'course')],
      'pgtap-demo-course-atomic-0001'
    )
  $test$,
  'demo course checkout completes atomically'
);

update demo_checkout_test_state
set order_id = (
  select id from public.course_orders
  where provider = 'development'
    and provider_reference = demo_checkout_test_state.idempotency_key
)
where kind = 'course';

select ok(
  (
    select status = 'paid'
      and provider = 'development'
      and is_demo = true
      and paid_at is not null
    from public.course_orders
    where id = (select order_id from demo_checkout_test_state where kind = 'course')
  ),
  'demo course order is paid and isolated'
);

select ok(
  (
    select count(*) = 1
      and bool_and(paid_at is not null)
    from public.course_order_items
    where order_id = (select order_id from demo_checkout_test_state where kind = 'course')
  ),
  'demo course order item receives the paid snapshot'
);

select ok(
  exists (
    select 1
    from public.enrollments enrollment
    where enrollment.user_id = '11111111-1111-4111-8111-111111111111'::uuid
      and enrollment.course_id = (select item_id from demo_checkout_test_state where kind = 'course')
      and enrollment.status = 'active'
      and enrollment.source = 'stripe'
  ),
  'paid demo course order grants an active enrollment'
);

update demo_checkout_test_state
set replay_result = public.create_demo_course_order(
  '11111111-1111-4111-8111-111111111111'::uuid,
  array[item_id],
  idempotency_key
)
where kind = 'course';

select ok(
  (
    select (replay_result ->> 'existing')::boolean
      and (replay_result ->> 'order_id')::uuid = order_id
    from demo_checkout_test_state
    where kind = 'course'
  ),
  'demo course checkout reuses the idempotent order'
);

select is(
  (
    select count(*)::integer
    from public.course_orders
    where provider = 'development'
      and provider_reference = 'pgtap-demo-course-atomic-0001'
  ),
  1,
  'demo course idempotency creates exactly one order'
);

select lives_ok(
  $test$
    select public.create_demo_digital_product_order(
      '11111111-1111-4111-8111-111111111111'::uuid,
      array[(select item_id from demo_checkout_test_state where kind = 'product')],
      'pgtap-demo-product-atomic-0001'
    )
  $test$,
  'demo digital product checkout completes atomically'
);

update demo_checkout_test_state
set order_id = (
  select id from public.digital_product_orders
  where provider = 'development'
    and provider_reference = demo_checkout_test_state.idempotency_key
)
where kind = 'product';

select ok(
  (
    select status = 'paid'
      and provider = 'development'
      and is_demo = true
      and paid_at is not null
      and idempotency_key = provider_reference
    from public.digital_product_orders
    where id = (select order_id from demo_checkout_test_state where kind = 'product')
  ),
  'demo digital product order is paid, isolated and keyed consistently'
);

select ok(
  (
    select count(*) = 1
      and bool_and(status = 'paid')
      and bool_and(paid_at is not null)
    from public.digital_product_order_items
    where order_id = (select order_id from demo_checkout_test_state where kind = 'product')
  ),
  'demo digital product item is paid atomically'
);

update demo_checkout_test_state
set replay_result = public.create_demo_digital_product_order(
  '11111111-1111-4111-8111-111111111111'::uuid,
  array[item_id],
  idempotency_key
)
where kind = 'product';

select ok(
  (
    select (replay_result ->> 'existing')::boolean
      and (replay_result ->> 'order_id')::uuid = order_id
    from demo_checkout_test_state
    where kind = 'product'
  ),
  'demo digital product checkout reuses the idempotent order'
);

select is(
  (
    select count(*)::integer
    from public.digital_product_orders
    where provider = 'development'
      and provider_reference = 'pgtap-demo-product-atomic-0001'
  ),
  1,
  'demo digital product idempotency creates exactly one order'
);

select throws_ok(
  $test$
    select public.create_demo_beat_order(
      '11111111-1111-4111-8111-111111111111'::uuid,
      array[
        (select item_id from demo_checkout_test_state where kind = 'beat'),
        'ffffffff-ffff-4fff-8fff-ffffffffffff'::uuid
      ],
      'pgtap-demo-beat-rollback-0001'
    )
  $test$,
  'P0001',
  'One or more demo licenses are unavailable',
  'invalid demo beat checkout raises a business error'
);

select is(
  (
    select count(*)::integer
    from public.beat_orders
    where provider = 'development'
      and provider_reference = 'pgtap-demo-beat-rollback-0001'
  ),
  0,
  'failed demo beat checkout leaves no order'
);

select throws_ok(
  $test$
    select public.create_demo_course_order(
      '11111111-1111-4111-8111-111111111111'::uuid,
      array[
        (select item_id from demo_checkout_test_state where kind = 'course'),
        'ffffffff-ffff-4fff-8fff-ffffffffffff'::uuid
      ],
      'pgtap-demo-course-rollback-0001'
    )
  $test$,
  'P0001',
  'One or more demo courses are unavailable',
  'invalid demo course checkout raises a business error'
);

select is(
  (
    select count(*)::integer
    from public.course_orders
    where provider = 'development'
      and provider_reference = 'pgtap-demo-course-rollback-0001'
  ),
  0,
  'failed demo course checkout leaves no order'
);

select throws_ok(
  $test$
    select public.create_demo_digital_product_order(
      '11111111-1111-4111-8111-111111111111'::uuid,
      array[
        (select item_id from demo_checkout_test_state where kind = 'product'),
        'ffffffff-ffff-4fff-8fff-ffffffffffff'::uuid
      ],
      'pgtap-demo-product-rollback-0001'
    )
  $test$,
  'P0001',
  'One or more demo products are unavailable',
  'invalid demo digital product checkout raises a business error'
);

select is(
  (
    select count(*)::integer
    from public.digital_product_orders
    where provider = 'development'
      and provider_reference = 'pgtap-demo-product-rollback-0001'
  ),
  0,
  'failed demo digital product checkout leaves no order'
);

select * from finish();
rollback;
