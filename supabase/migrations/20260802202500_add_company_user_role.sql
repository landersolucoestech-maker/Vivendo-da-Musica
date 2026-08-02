-- Extend the historical account-role enum in its own committed migration so
-- the company portal may safely reference the new value in later constraints.

do $$
begin
  if exists (
    select 1
    from pg_type type_definition
    join pg_namespace type_namespace on type_namespace.oid = type_definition.typnamespace
    where type_namespace.nspname = 'public'
      and type_definition.typname = 'user_role'
  ) then
    execute 'alter type public.user_role add value if not exists ''company''';
  end if;
end
$$;
