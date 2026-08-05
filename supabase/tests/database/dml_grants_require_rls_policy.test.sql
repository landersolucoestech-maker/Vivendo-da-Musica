begin;
create extension if not exists pgtap with schema extensions;
select plan(2);

select is(
  (
    with api_roles(role_name) as (
      values ('anon'), ('authenticated')
    ), commands(command_name) as (
      values ('INSERT'), ('UPDATE'), ('DELETE')
    )
    select count(*)::bigint
    from api_roles
    cross join commands
    join pg_class table_class
      on table_class.relkind in ('r', 'p')
    join pg_namespace schema_name
      on schema_name.oid = table_class.relnamespace
     and schema_name.nspname = 'public'
    where has_table_privilege(
      api_roles.role_name,
      table_class.oid,
      commands.command_name
    )
      and not exists (
        select 1
        from pg_policies policy
        where policy.schemaname = 'public'
          and policy.tablename = table_class.relname
          and policy.cmd in (commands.command_name, 'ALL')
          and (
            api_roles.role_name = any(policy.roles)
            or 'public' = any(policy.roles)
          )
      )
  ),
  0::bigint,
  'API roles have no DML grant without an applicable RLS policy'
);

select ok(
  has_table_privilege('anon', 'public.contact_messages', 'INSERT')
  and exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'contact_messages'
      and policyname = 'contact_messages_public_insert'
      and cmd = 'INSERT'
      and 'anon' = any(roles)
  ),
  'intentional public contact insert remains policy-backed'
);

select * from finish();
rollback;
