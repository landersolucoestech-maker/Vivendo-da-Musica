-- The company portal seed builds opportunity and application rows through
-- VALUES CTEs, whose enum-backed columns are inferred as text. Add temporary
-- assignment casts for historical databases that still use these enums.

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

  if exists (
    select 1
    from pg_type type_definition
    join pg_namespace type_namespace on type_namespace.oid = type_definition.typnamespace
    where type_namespace.nspname = 'public'
      and type_definition.typname = 'opportunity_application_status'
  ) and not exists (
    select 1
    from pg_cast cast_definition
    where cast_definition.castsource = 'text'::regtype
      and cast_definition.casttarget = (
        select type_definition.oid
        from pg_type type_definition
        join pg_namespace type_namespace on type_namespace.oid = type_definition.typnamespace
        where type_namespace.nspname = 'public'
          and type_definition.typname = 'opportunity_application_status'
      )
  ) then
    execute 'create cast (text as public.opportunity_application_status) with inout as assignment';
  end if;
end
$$;
