-- PostgreSQL grants TEMP to PUBLIC by default, so revoking it only from anon
-- and authenticated is ineffective. Replace the PUBLIC grant with explicit
-- grants for every existing non-client, non-system role. CONNECT remains
-- public and Supabase-managed roles preserve their previous TEMP capability.

do $$
declare
  database_name text := current_database();
  target_role record;
begin
  execute format(
    'revoke temporary on database %I from public',
    database_name
  );

  for target_role in
    select rolname
    from pg_roles
    where rolname not in ('anon', 'authenticated')
      and rolname not like 'pg\_%' escape '\'
  loop
    execute format(
      'grant temporary on database %I to %I',
      database_name,
      target_role.rolname
    );
  end loop;
end;
$$;
