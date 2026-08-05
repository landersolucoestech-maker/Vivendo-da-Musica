begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

select ok(
  to_regprocedure('public.create_demo_beat_order(uuid,uuid[],text)') is not null
  and to_regprocedure('public.create_demo_course_order(uuid,uuid[],text)') is not null
  and to_regprocedure('public.create_demo_digital_product_order(uuid,uuid[],text)') is not null,
  'atomic demo checkout RPCs exist'
);

select ok(
  has_function_privilege('service_role', 'public.create_demo_beat_order(uuid,uuid[],text)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.create_demo_course_order(uuid,uuid[],text)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.create_demo_digital_product_order(uuid,uuid[],text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.create_demo_beat_order(uuid,uuid[],text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.create_demo_course_order(uuid,uuid[],text)', 'EXECUTE')
  and not has_function_privilege('public', 'public.create_demo_digital_product_order(uuid,uuid[],text)', 'EXECUTE'),
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
      and p.proname in ('create_demo_beat_order','create_demo_course_order','create_demo_digital_product_order')
  ),
  'atomic demo checkout RPCs are hardened and locked'
);

create temporary table checkout_fixture (
  kind text primary key,
  item_id uuid not null,
  checkout_key text not null,
  order_id uuid,
  replay jsonb
) on commit drop;

insert into checkout_fixture
select 'beat', bl.id, 'pgtap-demo-beat-atomic-0001', null, null
from public.beat_licenses bl
join public.beats b on b.id = bl.beat_id
where bl.available and b.is_demo and b.status = 'published'
order by bl.is_exclusive, bl.id
limit 1;

update public.beats b
set master_file_path = coalesce(b.master_file_path, 'pgtap/demo-beat-master.wav')
from public.beat_licenses bl
where bl.id = (select item_id from checkout_fixture where kind = 'beat')
  and b.id = bl.beat_id;

insert into checkout_fixture
select 'course', id, 'pgtap-demo-course-atomic-0001', null, null
from public.courses
where is_demo and status = 'published'
order by id
limit 1;

insert into checkout_fixture
select 'product', id, 'pgtap-demo-product-atomic-0001', null, null
from public.seller_products
where is_demo and status = 'published'
  and seller_id <> '11111111-1111-4111-8111-111111111111'::uuid
order by id
limit 1;

select lives_ok(
  $$select public.create_demo_beat_order(
    '11111111-1111-4111-8111-111111111111'::uuid,
    array[(select item_id from checkout_fixture where kind='beat')],
    'pgtap-demo-beat-atomic-0001')$$,
  'beat checkout completes atomically'
);

update checkout_fixture f
set order_id = o.id
from public.beat_orders o
where f.kind = 'beat' and o.provider_reference = f.checkout_key;

select ok((select status='paid' and is_demo and paid_at is not null and amount_cents=subtotal_cents
  from public.beat_orders where id=(select order_id from checkout_fixture where kind='beat')),
  'beat order is paid and balanced');
select ok((select count(*)=1 and bool_and(status='paid') and bool_and(paid_at is not null)
  from public.beat_order_items where order_id=(select order_id from checkout_fixture where kind='beat')),
  'beat item is paid');
select ok(exists(select 1 from public.beat_license_purchases p join public.beat_order_items i on i.id=p.order_item_id
  where i.order_id=(select order_id from checkout_fixture where kind='beat') and p.status='active' and length(p.contract_hash)=64),
  'beat license contract is issued');
select ok(exists(select 1 from public.beat_deliveries d join public.beat_license_purchases p on p.id=d.purchase_id
  join public.beat_order_items i on i.id=p.order_item_id
  where i.order_id=(select order_id from checkout_fixture where kind='beat') and d.storage_bucket='beat-masters'),
  'beat master delivery is issued');

update checkout_fixture set replay=public.create_demo_beat_order(
  '11111111-1111-4111-8111-111111111111'::uuid,array[item_id],checkout_key) where kind='beat';
select ok((select (replay->>'existing')::boolean and (replay->>'order_id')::uuid=order_id
  from checkout_fixture where kind='beat'),'beat replay is idempotent');
select is((select count(*)::integer from public.beat_orders where provider_reference='pgtap-demo-beat-atomic-0001'),1,
  'beat replay creates one order');

select lives_ok(
  $$select public.create_demo_course_order(
    '11111111-1111-4111-8111-111111111111'::uuid,
    array[(select item_id from checkout_fixture where kind='course')],
    'pgtap-demo-course-atomic-0001')$$,
  'course checkout completes atomically'
);

update checkout_fixture f set order_id=o.id from public.course_orders o
where f.kind='course' and o.provider_reference=f.checkout_key;
select ok((select status='paid' and is_demo and paid_at is not null from public.course_orders
  where id=(select order_id from checkout_fixture where kind='course')),'course order is paid');
select ok((select count(*)=1 and bool_and(paid_at is not null) from public.course_order_items
  where order_id=(select order_id from checkout_fixture where kind='course')),'course item is paid');
select ok(exists(select 1 from public.enrollments e where e.user_id='11111111-1111-4111-8111-111111111111'::uuid
  and e.course_id=(select item_id from checkout_fixture where kind='course') and e.status='active'),
  'course enrollment is granted');
update checkout_fixture set replay=public.create_demo_course_order(
  '11111111-1111-4111-8111-111111111111'::uuid,array[item_id],checkout_key) where kind='course';
select ok((select (replay->>'existing')::boolean and (replay->>'order_id')::uuid=order_id
  from checkout_fixture where kind='course'),'course replay is idempotent');
select is((select count(*)::integer from public.course_orders where provider_reference='pgtap-demo-course-atomic-0001'),1,
  'course replay creates one order');

select lives_ok(
  $$select public.create_demo_digital_product_order(
    '11111111-1111-4111-8111-111111111111'::uuid,
    array[(select item_id from checkout_fixture where kind='product')],
    'pgtap-demo-product-atomic-0001')$$,
  'product checkout completes atomically'
);

update checkout_fixture f set order_id=o.id from public.digital_product_orders o
where f.kind='product' and o.provider_reference=f.checkout_key;
select ok((select status='paid' and is_demo and paid_at is not null and idempotency_key=provider_reference
  from public.digital_product_orders where id=(select order_id from checkout_fixture where kind='product')),
  'product order is paid and keyed');
select ok((select count(*)=1 and bool_and(status='paid') and bool_and(paid_at is not null)
  from public.digital_product_order_items where order_id=(select order_id from checkout_fixture where kind='product')),
  'product item is paid');
update checkout_fixture set replay=public.create_demo_digital_product_order(
  '11111111-1111-4111-8111-111111111111'::uuid,array[item_id],checkout_key) where kind='product';
select ok((select (replay->>'existing')::boolean and (replay->>'order_id')::uuid=order_id
  from checkout_fixture where kind='product'),'product replay is idempotent');
select is((select count(*)::integer from public.digital_product_orders where provider_reference='pgtap-demo-product-atomic-0001'),1,
  'product replay creates one order');

select throws_ok($$select public.create_demo_beat_order(
  '11111111-1111-4111-8111-111111111111'::uuid,
  array[(select item_id from checkout_fixture where kind='beat'),'ffffffff-ffff-4fff-8fff-ffffffffffff'::uuid],
  'pgtap-demo-beat-rollback-0001')$$,'P0001','One or more demo licenses are unavailable','invalid beat checkout rolls back');
select throws_ok($$select public.create_demo_course_order(
  '11111111-1111-4111-8111-111111111111'::uuid,
  array[(select item_id from checkout_fixture where kind='course'),'ffffffff-ffff-4fff-8fff-ffffffffffff'::uuid],
  'pgtap-demo-course-rollback-0001')$$,'P0001','One or more demo courses are unavailable','invalid course checkout rolls back');
select throws_ok($$select public.create_demo_digital_product_order(
  '11111111-1111-4111-8111-111111111111'::uuid,
  array[(select item_id from checkout_fixture where kind='product'),'ffffffff-ffff-4fff-8fff-ffffffffffff'::uuid],
  'pgtap-demo-product-rollback-0001')$$,'P0001','One or more demo products are unavailable','invalid product checkout rolls back');
select ok(
  not exists(select 1 from public.beat_orders where provider_reference='pgtap-demo-beat-rollback-0001')
  and not exists(select 1 from public.course_orders where provider_reference='pgtap-demo-course-rollback-0001')
  and not exists(select 1 from public.digital_product_orders where provider_reference='pgtap-demo-product-rollback-0001'),
  'failed checkouts leave no residual orders'
);

select * from finish();
rollback;
