begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

select is(
  (
    select count(*)::bigint
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in (
        'beneficiary_balances',
        'company_credit_balances',
        'ledger_account_balances',
        'published_courses_preview'
      )
      and grantee in ('anon', 'authenticated', 'service_role')
      and privilege_type <> 'SELECT'
  ),
  0::bigint,
  'public read-model views expose SELECT only'
);

select ok(
  has_table_privilege('anon', 'public.published_courses_preview', 'SELECT'),
  'anonymous course preview read remains available'
);

select ok(
  has_table_privilege('authenticated', 'public.beneficiary_balances', 'SELECT'),
  'authenticated beneficiary balance read remains available subject to base RLS'
);

select is(
  (
    select count(*)::bigint
    from pg_class view_row
    join pg_namespace schema_row on schema_row.oid = view_row.relnamespace
    where schema_row.nspname = 'public'
      and view_row.relname in (
        'beneficiary_balances',
        'company_credit_balances',
        'ledger_account_balances',
        'published_courses_preview'
      )
      and view_row.relkind = 'v'
      and 'security_invoker=true' = any(coalesce(view_row.reloptions, array[]::text[]))
  ),
  4::bigint,
  'public read-model views remain security invoker'
);

select * from finish();
rollback;
