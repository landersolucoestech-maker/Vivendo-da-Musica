begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

select has_table(
  'app_private',
  'platform_staff',
  'canonical platform staff authority exists'
);

select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'app_private.platform_staff'::regclass
  ),
  'platform staff authority has RLS enabled'
);

select ok(
  not has_table_privilege('anon', 'app_private.platform_staff', 'SELECT')
  and not has_table_privilege('authenticated', 'app_private.platform_staff', 'SELECT'),
  'API client roles cannot read platform staff records directly'
);

select ok(
  (
    select p.prosecdef
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app_private'
      and p.proname = 'is_platform_staff'
      and pg_get_function_identity_arguments(p.oid) = ''
  ),
  'private platform staff helper is SECURITY DEFINER'
);

select ok(
  not (
    select p.prosecdef
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'is_platform_staff'
      and pg_get_function_identity_arguments(p.oid) = ''
  ),
  'public platform staff wrapper is SECURITY INVOKER'
);

insert into auth.users (
  id,
  aud,
  role,
  email,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '9fa00000-0000-4000-8000-000000000001'::uuid,
    'authenticated',
    'authenticated',
    'legacy-role-admin@example.test',
    '{}'::jsonb,
    '{"full_name":"Legacy Role Admin"}'::jsonb,
    now(),
    now()
  ),
  (
    '9fa00000-0000-4000-8000-000000000002'::uuid,
    'authenticated',
    'authenticated',
    'canonical-platform-admin@example.test',
    '{}'::jsonb,
    '{"full_name":"Canonical Platform Admin"}'::jsonb,
    now(),
    now()
  ),
  (
    '9fa00000-0000-4000-8000-000000000003'::uuid,
    'authenticated',
    'authenticated',
    'capability-instructor@example.test',
    '{}'::jsonb,
    '{"full_name":"Capability Instructor"}'::jsonb,
    now(),
    now()
  );

update public.user_profiles
set role = 'admin'::public.user_role
where user_id = '9fa00000-0000-4000-8000-000000000001'::uuid;

insert into app_private.platform_staff (
  user_id,
  staff_role,
  status
) values (
  '9fa00000-0000-4000-8000-000000000002'::uuid,
  'admin',
  'active'
);

insert into public.account_capabilities (
  user_id,
  capability,
  status,
  is_default,
  activated_at,
  approved_at
) values (
  '9fa00000-0000-4000-8000-000000000003'::uuid,
  'instructor',
  'active',
  false,
  now(),
  now()
)
on conflict (user_id, capability) do update
set status = 'active',
    activated_at = coalesce(public.account_capabilities.activated_at, now()),
    approved_at = coalesce(public.account_capabilities.approved_at, now()),
    revoked_at = null;

set local role authenticated;

select set_config('request.jwt.claim.sub', '9fa00000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  public.is_platform_staff(),
  false,
  'legacy profile admin role alone does not grant platform staff authority'
);

select set_config('request.jwt.claim.sub', '9fa00000-0000-4000-8000-000000000002', true);

select is(
  public.is_platform_staff(),
  true,
  'platform staff record grants platform staff authority'
);

select is(
  public.is_admin(),
  true,
  'platform staff record grants administrative authority'
);

select set_config('request.jwt.claim.sub', '9fa00000-0000-4000-8000-000000000003', true);

select is(
  public.is_staff(),
  true,
  'active instructor capability grants functional staff access'
);

select is(
  public.is_platform_staff(),
  false,
  'instructor capability does not grant platform staff authority'
);

reset role;

select * from finish();
rollback;
