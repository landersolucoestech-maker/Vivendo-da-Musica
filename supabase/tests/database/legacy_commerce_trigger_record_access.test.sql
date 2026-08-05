begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

select ok(
  (
    select p.prosecdef
      and coalesce(p.proconfig, '{}'::text[]) @> array['search_path=""']
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app_private'
      and p.proname = 'sync_legacy_commerce_trigger'
  ),
  'legacy commerce trigger is a hardened security definer'
);

select ok(
  (
    select position('to_jsonb(new)' in lower(pg_get_functiondef(p.oid))) > 0
      and position('new.order_id' in lower(pg_get_functiondef(p.oid))) = 0
      and position("row_data ->> 'order_id'" in lower(pg_get_functiondef(p.oid))) > 0
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app_private'
      and p.proname = 'sync_legacy_commerce_trigger'
  ),
  'legacy commerce trigger resolves optional record fields through jsonb'
);

select ok(
  not has_function_privilege('anon', 'app_private.sync_legacy_commerce_trigger()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'app_private.sync_legacy_commerce_trigger()', 'EXECUTE')
  and not has_function_privilege('service_role', 'app_private.sync_legacy_commerce_trigger()', 'EXECUTE'),
  'legacy commerce trigger cannot be executed directly by API roles'
);

select lives_ok(
  $test$
    insert into public.beat_orders (
      buyer_id, status, provider, provider_reference,
      amount_cents, subtotal_cents, currency, is_demo
    ) values (
      '11111111-1111-4111-8111-111111111111'::uuid,
      'pending', 'development', 'pgtap-trigger-beat-0001',
      100, 100, 'BRL', true
    )
  $test$,
  'beat order trigger resolves the parent id without NEW.order_id'
);

select lives_ok(
  $test$
    insert into public.course_orders (
      user_id, status, provider, provider_reference,
      amount_cents, currency, is_demo
    ) values (
      '11111111-1111-4111-8111-111111111111'::uuid,
      'pending', 'development', 'pgtap-trigger-course-0001',
      100, 'BRL', true
    )
  $test$,
  'course order trigger resolves the parent id without NEW.order_id'
);

select lives_ok(
  $test$
    insert into public.digital_product_orders (
      buyer_id, status, provider, provider_reference, idempotency_key,
      amount_cents, currency, is_demo
    ) values (
      '11111111-1111-4111-8111-111111111111'::uuid,
      'pending', 'development', 'pgtap-trigger-product-0001',
      'pgtap-trigger-product-0001', 100, 'BRL', true
    )
  $test$,
  'digital product order trigger resolves the parent id without NEW.order_id'
);

select * from finish();
rollback;
