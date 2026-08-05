-- Supabase grants broad table privileges by default and relies on RLS for row
-- authorization. Remove DML privileges where the target API role has no
-- applicable policy for that command. Existing, policy-backed flows retain
-- their grants; future features must add both their policy and explicit grant.

do $$
declare
  api_role text;
  command_name text;
  target_table record;
begin
  foreach api_role in array array['anon', 'authenticated'] loop
    foreach command_name in array array['INSERT', 'UPDATE', 'DELETE'] loop
      for target_table in
        select table_class.oid, table_class.relname as table_name
        from pg_class table_class
        join pg_namespace schema_name
          on schema_name.oid = table_class.relnamespace
        where schema_name.nspname = 'public'
          and table_class.relkind in ('r', 'p')
          and has_table_privilege(api_role, table_class.oid, command_name)
          and not exists (
            select 1
            from pg_policies policy
            where policy.schemaname = 'public'
              and policy.tablename = table_class.relname
              and policy.cmd in (command_name, 'ALL')
              and (
                api_role = any(policy.roles)
                or 'public' = any(policy.roles)
              )
          )
      loop
        execute format(
          'revoke %s on table public.%I from %I',
          command_name,
          target_table.table_name,
          api_role
        );
      end loop;
    end loop;
  end loop;
end;
$$;
