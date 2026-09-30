begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

insert into auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '9cb00000-0000-4000-8000-000000000001'::uuid,
    'authenticated',
    'authenticated',
    'commerce-buyer@example.test',
    '{}'::jsonb,
    '{"full_name":"Commerce Buyer"}'::jsonb,
    now(),
    now()
  ),
  (
    '9cb00000-0000-4000-8000-000000000002'::uuid,
    'authenticated',
    'authenticated',
    'commerce-seller@example.test',
    '{}'::jsonb,
    '{"full_name":"Commerce Seller"}'::jsonb,
    now(),
    now()
  );

insert into public.commerce_offers (
  id, resource_type, resource_id, seller_id, title, status, currency, is_demo
) values
  (
    '9cb10000-0000-4000-8000-000000000001'::uuid,
    'job_credit_pack',
    '9cb20000-0000-4000-8000-000000000001'::uuid,
    null,
    'Platform-owned offer',
    'active',
    'BRL',
    true
  ),
  (
    '9cb10000-0000-4000-8000-000000000002'::uuid,
    'digital_product',
    '9cb20000-0000-4000-8000-000000000002'::uuid,
    '9cb00000-0000-4000-8000-000000000002'::uuid,
    'Seller-owned offer',
    'active',
    'BRL',
    true
  ),
  (
    '9cb10000-0000-4000-8000-000000000003'::uuid,
    'digital_product',
    '9cb20000-0000-4000-8000-000000000003'::uuid,
    '9cb00000-0000-4000-8000-000000000002'::uuid,
    'USD offer',
    'active',
    'USD',
    true
  );

insert into public.commerce_offer_prices (
  id, offer_id, version, amount_cents, currency, status, effective_from, published_at
) values
  (
    '9cb30000-0000-4000-8000-000000000001'::uuid,
    '9cb10000-0000-4000-8000-000000000001'::uuid,
    1,
    10000,
    'BRL',
    'published',
    now() - interval '1 minute',
    now() - interval '1 minute'
  ),
  (
    '9cb30000-0000-4000-8000-000000000002'::uuid,
    '9cb10000-0000-4000-8000-000000000002'::uuid,
    1,
    20000,
    'BRL',
    'published',
    now() - interval '1 minute',
    now() - interval '1 minute'
  ),
  (
    '9cb30000-0000-4000-8000-000000000003'::uuid,
    '9cb10000-0000-4000-8000-000000000003'::uuid,
    1,
    30000,
    'USD',
    'published',
    now() - interval '1 minute',
    now() - interval '1 minute'
  );

create temporary table canonical_checkout_result on commit drop as
select (app_private.create_commerce_order(
  '9cb00000-0000-4000-8000-000000000001'::uuid,
  array[
    '9cb10000-0000-4000-8000-000000000002'::uuid,
    '9cb10000-0000-4000-8000-000000000001'::uuid
  ],
  '{"companyId":"9cb40000-0000-4000-8000-000000000001"}'::jsonb,
  'commerce:test:canonical:0001',
  true
)).*;

select is(
  (select total_cents from canonical_checkout_result),
  30000::bigint,
  'canonical order total comes from current server-side offer prices'
);

select is(
  (select currency from canonical_checkout_result),
  'BRL',
  'canonical order uses the common server-side currency'
);

select is(
  (select status from canonical_checkout_result),
  'pending',
  'new canonical order starts pending'
);

select is(
  (
    select count(*)::integer
    from public.commerce_order_items
    where order_id = (select id from canonical_checkout_result)
  ),
  2,
  'canonical order persists one item per offer'
);

select is(
  (
    select platform_commission_cents
    from public.commerce_order_items
    where order_id = (select id from canonical_checkout_result)
      and offer_id = '9cb10000-0000-4000-8000-000000000001'::uuid
  ),
  10000::bigint,
  'platform-owned offer allocates the entire item to the platform'
);

select is(
  (
    select platform_commission_cents
    from public.commerce_order_items
    where order_id = (select id from canonical_checkout_result)
      and offer_id = '9cb10000-0000-4000-8000-000000000002'::uuid
  ),
  3000::bigint,
  'seller-owned offer snapshots the configured 1500 bps platform commission'
);

select is(
  (
    select seller_net_cents
    from public.commerce_order_items
    where order_id = (select id from canonical_checkout_result)
      and offer_id = '9cb10000-0000-4000-8000-000000000002'::uuid
  ),
  17000::bigint,
  'seller-owned offer preserves the seller net amount'
);

select is(
  (
    select sum(platform_commission_cents + affiliate_commission_cents + seller_net_cents)
    from public.commerce_order_items
    where order_id = (select id from canonical_checkout_result)
  ),
  30000::numeric,
  'canonical order item splits remain balanced'
);

select is(
  (
    select checkout_snapshot->'context'->>'companyId'
    from public.commerce_orders
    where id = (select id from canonical_checkout_result)
  ),
  '9cb40000-0000-4000-8000-000000000001',
  'checkout context is preserved in the canonical snapshot'
);

select is(
  (
    select (app_private.create_commerce_order(
      '9cb00000-0000-4000-8000-000000000001'::uuid,
      array[
        '9cb10000-0000-4000-8000-000000000001'::uuid,
        '9cb10000-0000-4000-8000-000000000002'::uuid
      ],
      '{"companyId":"9cb40000-0000-4000-8000-000000000001"}'::jsonb,
      'commerce:test:canonical:0001',
      true
    )).id
  ),
  (select id from canonical_checkout_result),
  'replaying the same idempotency key returns the same order'
);

select is(
  (
    select count(*)::integer
    from public.commerce_orders
    where idempotency_key = 'commerce:test:canonical:0001'
  ),
  1,
  'idempotent replay does not duplicate the order'
);

select throws_ok(
  $$
    select app_private.create_commerce_order(
      '9cb00000-0000-4000-8000-000000000001'::uuid,
      array['9cb10000-0000-4000-8000-000000000001'::uuid],
      '{}'::jsonb,
      'commerce:test:canonical:0001',
      true
    )
  $$,
  '23505',
  'Checkout idempotency key conflicts with another order.',
  'reusing an idempotency key with another offer set is rejected'
);

select throws_ok(
  $$
    select app_private.create_commerce_order(
      '9cb00000-0000-4000-8000-000000000001'::uuid,
      array[
        '9cb10000-0000-4000-8000-000000000001'::uuid,
        '9cb10000-0000-4000-8000-000000000001'::uuid
      ],
      '{}'::jsonb,
      'commerce:test:canonical:0002',
      true
    )
  $$,
  '22023',
  'Duplicate offers are not allowed.',
  'duplicate offers are rejected before order creation'
);

select throws_ok(
  $$
    select app_private.create_commerce_order(
      '9cb00000-0000-4000-8000-000000000001'::uuid,
      array[
        '9cb10000-0000-4000-8000-000000000001'::uuid,
        '9cb10000-0000-4000-8000-000000000003'::uuid
      ],
      '{}'::jsonb,
      'commerce:test:canonical:0003',
      true
    )
  $$,
  '22023',
  'Checkout offers must use one valid currency.',
  'mixed currencies are rejected'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.service_create_commerce_order(uuid,uuid[],jsonb,text,boolean)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated',
    'public.service_create_commerce_order(uuid,uuid[],jsonb,text,boolean)',
    'EXECUTE'
  ),
  'canonical order service wrapper is service-role only'
);

select * from finish();
rollback;
