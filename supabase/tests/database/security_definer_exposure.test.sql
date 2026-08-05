begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

select is(
  (
    select count(*)::bigint
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'v'
      and not ('security_invoker=true' = any(coalesce(c.reloptions, array[]::text[])))
  ),
  0::bigint,
  'all public views execute with security_invoker'
);

select is(
  (
    select count(*)::bigint
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and has_function_privilege('anon', p.oid, 'EXECUTE')
  ),
  0::bigint,
  'anon cannot execute public SECURITY DEFINER functions'
);

select is(
  (
    select count(*)::bigint
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and has_function_privilege('authenticated', p.oid, 'EXECUTE')
  ),
  0::bigint,
  'authenticated cannot execute public SECURITY DEFINER functions directly'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.mark_digital_product_order_paid(uuid,text,text)',
    'EXECUTE'
  ),
  'service_role retains privileged payment RPC access'
);

select * from finish();
rollback;
