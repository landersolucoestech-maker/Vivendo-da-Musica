-- Extend historical enums in their own committed migration so later checks and
-- triggers may safely reference the new workflow values. Databases already
-- reconciled to text columns may no longer retain these enum types.

do $$
begin
  if exists (
    select 1
    from pg_type type_definition
    join pg_namespace type_namespace on type_namespace.oid = type_definition.typnamespace
    where type_namespace.nspname = 'public'
      and type_definition.typname = 'opportunity_kind'
  ) then
    execute 'alter type public.opportunity_kind add value if not exists ''vaga''';
    execute 'alter type public.opportunity_kind add value if not exists ''freela''';
    execute 'alter type public.opportunity_kind add value if not exists ''colaboracao''';
    execute 'alter type public.opportunity_kind add value if not exists ''edital''';
    execute 'alter type public.opportunity_kind add value if not exists ''concurso''';
  end if;

  if exists (
    select 1
    from pg_type type_definition
    join pg_namespace type_namespace on type_namespace.oid = type_definition.typnamespace
    where type_namespace.nspname = 'public'
      and type_definition.typname = 'opportunity_application_status'
  ) then
    execute 'alter type public.opportunity_application_status add value if not exists ''interview''';
    execute 'alter type public.opportunity_application_status add value if not exists ''approved''';
  end if;
end
$$;
