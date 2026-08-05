begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

select is(
  (
    select count(*)::bigint
    from pg_proc function_row
    join pg_namespace schema_row on schema_row.oid = function_row.pronamespace
    cross join lateral aclexplode(function_row.proacl) expanded_acl
    where schema_row.nspname in (
        'public',
        'app_private',
        'authz_private',
        'legacy_archive'
      )
      and expanded_acl.grantee = 0
      and expanded_acl.privilege_type = 'EXECUTE'
  ),
  0::bigint,
  'application functions grant no EXECUTE to PUBLIC'
);

select ok(
  has_function_privilege('anon', 'public.current_role()', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.current_role()', 'EXECUTE')
  and has_function_privilege('service_role', 'public.current_role()', 'EXECUTE'),
  'explicit current-role helper grants remain available'
);

select ok(
  has_function_privilege(
    'anon',
    'public.resolve_commercial_parameter(text,text,uuid,timestamptz)',
    'EXECUTE'
  )
  and has_function_privilege(
    'authenticated',
    'public.resolve_commercial_parameter(text,text,uuid,timestamptz)',
    'EXECUTE'
  ),
  'commercial parameter resolver retains explicit API grants'
);

select * from finish();
rollback;
