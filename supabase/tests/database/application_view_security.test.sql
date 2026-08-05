begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

select is(
  (
    select count(*)::bigint
    from pg_class view_row
    join pg_namespace schema_row
      on schema_row.oid = view_row.relnamespace
    where schema_row.nspname in (
        'public',
        'app_private',
        'authz_private',
        'legacy_archive'
      )
      and view_row.relkind = 'v'
      and not (
        'security_invoker=true' = any(
          coalesce(view_row.reloptions, array[]::text[])
        )
      )
  ),
  0::bigint,
  'all application views execute with caller privileges'
);

select ok(
  has_table_privilege(
    'service_role',
    'app_private.legacy_commerce_orders',
    'SELECT'
  ),
  'service role retains legacy order reconciliation access'
);

select ok(
  not has_table_privilege(
    'anon',
    'app_private.legacy_commerce_orders',
    'SELECT'
  )
  and not has_table_privilege(
    'authenticated',
    'app_private.legacy_commerce_order_items',
    'SELECT'
  ),
  'client roles cannot read private legacy commerce views'
);

select * from finish();
rollback;
