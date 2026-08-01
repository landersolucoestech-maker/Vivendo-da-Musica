do $$
declare
  relation record;
begin
  for relation in
    select format('%I.%I', schemaname, tablename) as qualified_name
    from pg_tables
    where schemaname = 'public'
  loop
    execute format('revoke truncate, references, trigger on table %s from anon, authenticated', relation.qualified_name);
  end loop;
end
$$;
