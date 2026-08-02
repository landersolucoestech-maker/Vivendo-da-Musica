-- The company portal seed builds its opportunity rows through a VALUES CTE,
-- whose kind column is inferred as text. Add a temporary assignment cast for
-- historical databases that still use the opportunity_kind enum.

do $$
begin
  if exists (
    select 1
    from pg_type type_definition
    join pg_namespace type_namespace on type_namespace.oid = type_definition.typnamespace
    where type_namespace.nspname = 'public'
      and type_definition.typname = 'opportunity_kind'
  ) and not exists (
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
    execute 'create cast (text as public.opportunity_kind) with inout as assignment';
  end if;
end
$$;
