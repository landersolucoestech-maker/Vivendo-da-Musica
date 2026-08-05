-- Trigger functions are invoked by PostgreSQL, not directly by API clients.
-- Revoke client execution from every application trigger function, including
-- functions introduced after earlier hardening migrations.

do $$
declare
  trigger_function record;
begin
  for trigger_function in
    select distinct function_row.oid
    from pg_trigger trigger_row
    join pg_proc function_row on function_row.oid = trigger_row.tgfoid
    join pg_class table_row on table_row.oid = trigger_row.tgrelid
    join pg_namespace table_schema on table_schema.oid = table_row.relnamespace
    where not trigger_row.tgisinternal
      and table_schema.nspname in ('public', 'auth')
  loop
    execute format(
      'revoke execute on function %s from public, anon, authenticated',
      trigger_function.oid::regprocedure
    );
  end loop;
end;
$$;
