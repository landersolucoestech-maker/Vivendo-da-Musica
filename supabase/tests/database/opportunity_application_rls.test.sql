begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

with effective_policies as (
  select
    policy.tablename,
    policy.policyname,
    policy.cmd,
    effective_role.role_name
  from pg_policies as policy
  cross join (values ('anon'::name), ('authenticated'::name)) as effective_role(role_name)
  where policy.schemaname = 'public'
    and policy.tablename in ('opportunities', 'opportunity_applications')
    and (
      'public' = any(policy.roles)
      or effective_role.role_name = any(policy.roles)
    )
), duplicates as (
  select tablename, cmd, role_name
  from effective_policies
  group by tablename, cmd, role_name
  having count(*) > 1
)
select is(
  (select count(*)::bigint from duplicates),
  0::bigint,
  'opportunity policies are unique per effective role and action'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename = 'opportunities'
      and policyname = 'opportunities_company_insert'
      and with_check ilike '%is_company_member(company_id)%'
      and with_check ilike '%status = ANY%'
      and with_check ilike '%credit_event_id IS NULL%'
  ),
  1::bigint,
  'direct authenticated opportunity inserts require membership and cannot fake credit publication'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename = 'opportunity_applications'
      and policyname = 'opportunity_applications_candidate_insert'
      and with_check ilike '%status = ''submitted''%'
      and with_check ilike '%application_deadline%'
      and with_check ilike '%posting_expires_at%'
  ),
  1::bigint,
  'candidate applications require submitted status and valid deadlines'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename = 'opportunity_applications'
      and policyname = 'opportunity_applications_anon_insert'
      and with_check ilike '%opportunity.is_demo = true%'
      and with_check ilike '%status = ''submitted''%'
  ),
  1::bigint,
  'anonymous applications are restricted to the demo opportunity flow'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename = 'opportunity_applications'
      and policyname = 'opportunity_applications_authenticated_update'
      and qual ilike '%status = ANY%'
      and with_check ilike '%status = ''withdrawn''%'
  ),
  1::bigint,
  'candidate updates are constrained to withdrawal while company members retain review access'
);

select is(
  (
    select count(*)::bigint
    from pg_trigger
    where tgrelid = 'public.opportunities'::regclass
      and tgname = 'protect_opportunity_client_update'
      and not tgisinternal
  ),
  1::bigint,
  'opportunity immutable-field trigger exists'
);

select is(
  (
    select count(*)::bigint
    from pg_trigger
    where tgrelid = 'public.opportunity_applications'::regclass
      and tgname = 'protect_opportunity_application_client_update'
      and not tgisinternal
  ),
  1::bigint,
  'application immutable-field trigger exists'
);

select ok(
  not has_function_privilege('anon', 'app_private.protect_opportunity_client_update()', 'EXECUTE'),
  'anonymous users cannot invoke the opportunity trigger function'
);

select ok(
  not has_function_privilege('authenticated', 'app_private.protect_opportunity_application_client_update()', 'EXECUTE'),
  'authenticated users cannot invoke the application trigger function directly'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename in ('opportunities', 'opportunity_applications')
      and policyname in (
        'Public reads open opportunities',
        'Users submit opportunities',
        'Owners edit unpublished opportunities',
        'Staff moderates opportunities',
        'Owners delete unpublished opportunities',
        'Users apply as themselves',
        'Applicants and owners read applications',
        'Applicants withdraw applications',
        'Owners manage applications'
      )
  ),
  0::bigint,
  'legacy opportunity policies are absent'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename = 'opportunities'
      and policyname = 'opportunities_authenticated_read'
      and qual ilike '%is_company_member(company_id)%'
      and qual ilike '%is_platform_staff()%'
  ),
  1::bigint,
  'authenticated opportunity reads preserve company and staff access'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename = 'opportunity_applications'
      and policyname = 'opportunity_applications_authenticated_read'
      and qual ilike '%applicant_id = ( SELECT auth.uid()%'
      and qual ilike '%is_company_member%'
      and qual ilike '%is_platform_staff()%'
  ),
  1::bigint,
  'application reads preserve applicant, company and staff access'
);

select * from finish();
rollback;
