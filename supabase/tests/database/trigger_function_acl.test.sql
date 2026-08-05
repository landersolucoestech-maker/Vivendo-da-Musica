begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

select is(
  (
    select count(*)::bigint
    from pg_trigger trigger_row
    join pg_proc function_row on function_row.oid = trigger_row.tgfoid
    join pg_class table_row on table_row.oid = trigger_row.tgrelid
    join pg_namespace table_schema on table_schema.oid = table_row.relnamespace
    where not trigger_row.tgisinternal
      and table_schema.nspname in ('public', 'auth')
      and has_function_privilege('anon', function_row.oid, 'EXECUTE')
  ),
  0::bigint,
  'anon cannot execute application trigger functions'
);

select is(
  (
    select count(*)::bigint
    from pg_trigger trigger_row
    join pg_proc function_row on function_row.oid = trigger_row.tgfoid
    join pg_class table_row on table_row.oid = trigger_row.tgrelid
    join pg_namespace table_schema on table_schema.oid = table_row.relnamespace
    where not trigger_row.tgisinternal
      and table_schema.nspname in ('public', 'auth')
      and has_function_privilege('authenticated', function_row.oid, 'EXECUTE')
  ),
  0::bigint,
  'authenticated cannot execute application trigger functions'
);

select ok(
  exists (
    select 1
    from pg_trigger trigger_row
    join pg_proc function_row on function_row.oid = trigger_row.tgfoid
    where not trigger_row.tgisinternal
      and function_row.proname = 'assert_ledger_transaction_balanced'
  ),
  'ledger balance trigger remains installed after ACL hardening'
);

select * from finish();
rollback;
