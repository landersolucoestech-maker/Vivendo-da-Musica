begin;
create extension if not exists pgtap with schema extensions;
select plan(2);

select is(
  (
    select array_agg(table_class.relname order by table_class.relname)
    from pg_class table_class
    join pg_namespace schema_name on schema_name.oid = table_class.relnamespace
    where schema_name.nspname = 'public'
      and table_class.relkind in ('r', 'p')
      and has_table_privilege('anon', table_class.oid, 'SELECT')
      and not exists (
        select 1
        from pg_policies policy
        where policy.schemaname = 'public'
          and policy.tablename = table_class.relname
          and policy.cmd in ('SELECT', 'ALL')
          and ('anon' = any(policy.roles) or 'public' = any(policy.roles))
      )
  ),
  array[
    'account_capabilities',
    'ledger_accounts',
    'ledger_postings'
  ]::name[],
  'anonymous SELECT without a direct policy is limited to reviewed dependencies'
);

select ok(
  not has_table_privilege('anon', 'public.webhook_receipts', 'SELECT')
  and not has_table_privilege('anon', 'public.financial_accounts', 'SELECT')
  and not has_table_privilege('anon', 'public.payment_reconciliation_reports', 'SELECT'),
  'anonymous cannot select operational or financial internals'
);

select * from finish();
rollback;
