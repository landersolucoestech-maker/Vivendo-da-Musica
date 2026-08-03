-- PostgREST clients never need schema-adjacent table privileges. TRUNCATE
-- bypasses row-level security entirely, while REFERENCES and TRIGGER are also
-- inappropriate for API roles. Preserve table-specific SELECT/DML grants and
-- their RLS boundaries, but remove these capabilities from every public table.

do $$
declare
  target record;
begin
  for target in
    select format('%I.%I', schemaname, tablename) as qualified_name
    from pg_tables
    where schemaname = 'public'
  loop
    execute format(
      'revoke truncate, references, trigger on table %s from anon, authenticated',
      target.qualified_name
    );
  end loop;
end
$$;
