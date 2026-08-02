-- Remove the compatibility cast after the company portal fixtures are loaded.

do $$
begin
  if exists (
    select 1
    from pg_type type_definition
    join pg_namespace type_namespace on type_namespace.oid = type_definition.typnamespace
    where type_namespace.nspname = 'public'
      and type_definition.typname = 'opportunity_kind'
  ) and exists (
    select 1
    from pg_cast cast_definition
    where cast_definition.castsource = 'text'::regtype
      and cast_definition.casttarget = (
        select type_definition.oid
        from pg_type type_definition
        join pg_namespace type_namespace on type_namespace.oid = type_definition.typnamespace
        where type_namespace.nspname = 'public'
          and type_definition.typname = 'opportunity_kind'
      )
  ) then
    execute 'drop cast (text as public.opportunity_kind)';
  end if;
end
$$;
