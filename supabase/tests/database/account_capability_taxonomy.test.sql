begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

select ok(
  (
    select pg_get_constraintdef(oid)
    from pg_constraint
    where conrelid = 'public.account_capabilities'::regclass
      and conname = 'account_capabilities_capability_check'
  ) like '%student%'
  and (
    select pg_get_constraintdef(oid)
    from pg_constraint
    where conrelid = 'public.account_capabilities'::regclass
      and conname = 'account_capabilities_capability_check'
  ) like '%instructor%'
  and (
    select pg_get_constraintdef(oid)
    from pg_constraint
    where conrelid = 'public.account_capabilities'::regclass
      and conname = 'account_capabilities_capability_check'
  ) like '%producer%'
  and (
    select pg_get_constraintdef(oid)
    from pg_constraint
    where conrelid = 'public.account_capabilities'::regclass
      and conname = 'account_capabilities_capability_check'
  ) like '%affiliate%',
  'account capability constraint preserves the four personal portal capabilities'
);

select ok(
  (
    select pg_get_constraintdef(oid)
    from pg_constraint
    where conrelid = 'public.account_capabilities'::regclass
      and conname = 'account_capabilities_capability_check'
  ) not like '%company%'
  and (
    select pg_get_constraintdef(oid)
    from pg_constraint
    where conrelid = 'public.account_capabilities'::regclass
      and conname = 'account_capabilities_capability_check'
  ) not like '%admin%'
  and (
    select pg_get_constraintdef(oid)
    from pg_constraint
    where conrelid = 'public.account_capabilities'::regclass
      and conname = 'account_capabilities_capability_check'
  ) not like '%super_admin%',
  'company and platform staff are not account capabilities'
);

select is(
  (
    select count(*)::integer
    from public.account_capabilities
    where capability in ('company', 'admin', 'super_admin')
  ),
  0,
  'legacy authority capabilities are absent'
);

select is(
  (
    select count(*)::integer
    from pg_trigger
    where tgrelid = 'public.user_profiles'::regclass
      and tgname in ('sync_profile_account_capabilities', 'sync_profile_capabilities_trigger')
      and not tgisinternal
  ),
  0,
  'profile role no longer synchronizes account capabilities'
);

select is(
  (
    select count(*)::integer
    from pg_trigger
    where tgrelid = 'public.company_members'::regclass
      and tgname = 'sync_company_member_capability_trigger'
      and not tgisinternal
  ),
  0,
  'company membership no longer creates a company capability'
);

select ok(
  exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.user_profiles'::regclass
      and tgname = 'ensure_student_account_capability'
      and not tgisinternal
  ),
  'new profiles bootstrap the student capability'
);

select ok(
  to_regprocedure('app_private.sync_profile_account_capabilities()') is null
  and to_regprocedure('public.sync_profile_capabilities()') is null
  and to_regprocedure('public.sync_company_member_capability()') is null,
  'legacy capability synchronization functions are removed'
);

select ok(
  (
    select pg_get_functiondef(p.oid)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'request_account_capability'
      and pg_get_function_identity_arguments(p.oid) = 'target_capability text'
  ) not like '%''company''%',
  'self-service capability requests cannot request company access'
);

select ok(
  (
    select pg_get_functiondef(p.oid)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'admin_set_account_capability'
      and pg_get_function_identity_arguments(p.oid) =
        'target_user_id uuid, target_capability text, target_status text, target_is_default boolean'
  ) not like '%''company''%'
  and (
    select pg_get_functiondef(p.oid)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'admin_set_account_capability'
      and pg_get_function_identity_arguments(p.oid) =
        'target_user_id uuid, target_capability text, target_status text, target_is_default boolean'
  ) not like '%''super_admin''%',
  'administrative capability management is limited to personal portal capabilities'
);

select ok(
  (
    select pg_get_functiondef(p.oid)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'admin_set_account_capability'
      and pg_get_function_identity_arguments(p.oid) =
        'target_user_id uuid, target_capability text, target_status text, target_is_default boolean'
  ) not like '%update public.user_profiles%',
  'capability management no longer writes the legacy profile role'
);

select is(
  (
    select count(*)::integer
    from public.user_profiles profile
    where not exists (
      select 1
      from public.account_capabilities capability
      where capability.user_id = profile.user_id
        and capability.capability = 'student'
        and capability.status = 'active'
    )
  ),
  0,
  'every profile has an active student capability'
);

select ok(
  not exists (
    select 1
    from public.account_capabilities capability
    where capability.is_default
      and capability.capability not in ('student', 'instructor', 'producer', 'affiliate')
  ),
  'default capability always belongs to a personal portal'
);

select * from finish();
rollback;
