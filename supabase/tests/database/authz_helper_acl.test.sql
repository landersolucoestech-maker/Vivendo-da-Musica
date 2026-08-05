begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

select is(
  (
    select count(*)::bigint
    from pg_proc helper
    join pg_namespace helper_schema
      on helper_schema.oid = helper.pronamespace
    where helper_schema.nspname = 'authz_private'
      and helper.proname in (
        'current_user_role',
        'is_beat_owner',
        'is_course_staff',
        'is_enrolled'
      )
      and helper.proacl is null
  ),
  0::bigint,
  'authorization helpers do not inherit default PUBLIC execute'
);

select ok(
  has_function_privilege('anon', 'authz_private.is_course_staff(uuid)', 'EXECUTE'),
  'anon retains helper execution required by demo RLS policies'
);

select ok(
  has_function_privilege('authenticated', 'authz_private.is_enrolled(uuid)', 'EXECUTE'),
  'authenticated retains enrollment helper execution'
);

select ok(
  has_function_privilege('service_role', 'authz_private.current_user_role()', 'EXECUTE'),
  'service role retains authorization helper execution'
);

select ok(
  not has_schema_privilege('anon', 'authz_private', 'USAGE')
  and not has_schema_privilege('authenticated', 'authz_private', 'USAGE'),
  'authorization implementation schema remains unavailable for direct API lookup'
);

select * from finish();
rollback;
