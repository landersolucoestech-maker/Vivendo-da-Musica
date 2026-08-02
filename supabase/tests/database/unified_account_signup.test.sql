begin;

select plan(15);

select has_function(
  'public',
  'handle_new_auth_user',
  array[]::text[],
  'unified auth provisioning trigger function exists'
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
    '8a200000-0000-4000-8000-000000000001'::uuid,
    'authenticated',
    'authenticated',
    'unified-student@example.test',
    '{}'::jsonb,
    '{"full_name":"Aluno Unificado","account_type":"student"}'::jsonb,
    now(),
    now()
  ),
  (
    '8a200000-0000-4000-8000-000000000002'::uuid,
    'authenticated',
    'authenticated',
    'unified-producer@example.test',
    '{}'::jsonb,
    '{"full_name":"Produtor Unificado","account_type":"producer","professional_name":"Produtor Musical","portfolio_url":"https://example.test/produtor","experience_years":"8"}'::jsonb,
    now(),
    now()
  ),
  (
    '8a200000-0000-4000-8000-000000000003'::uuid,
    'authenticated',
    'authenticated',
    'unified-instructor@example.test',
    '{}'::jsonb,
    '{"full_name":"Instrutor Unificado","account_type":"instructor","specialty":"Produção musical","experience_years":"12"}'::jsonb,
    now(),
    now()
  ),
  (
    '8a200000-0000-4000-8000-000000000004'::uuid,
    'authenticated',
    'authenticated',
    'unified-company@example.test',
    '{}'::jsonb,
    '{"full_name":"Responsável Empresa","account_type":"company","company_name":"Empresa Unificada","website_url":"https://empresa.example.test"}'::jsonb,
    now(),
    now()
  ),
  (
    '8a200000-0000-4000-8000-000000000005'::uuid,
    'authenticated',
    'authenticated',
    'unified-affiliate@example.test',
    '{}'::jsonb,
    '{"full_name":"Afiliado Unificado","account_type":"affiliate","channel_name":"Canal Unificado","channel_url":"https://example.test/canal"}'::jsonb,
    now(),
    now()
  ),
  (
    '8a200000-0000-4000-8000-000000000006'::uuid,
    'authenticated',
    'authenticated',
    'unified-admin-attempt@example.test',
    '{}'::jsonb,
    '{"full_name":"Tentativa Administrativa","account_type":"admin"}'::jsonb,
    now(),
    now()
  );

select is(
  (select role::text from public.user_profiles where user_id = '8a200000-0000-4000-8000-000000000001'::uuid),
  'student',
  'student signup receives the student role'
);

select is(
  (select role::text from public.user_profiles where user_id = '8a200000-0000-4000-8000-000000000002'::uuid),
  'producer',
  'producer signup receives the producer role'
);

select is(
  (select role::text from public.user_profiles where user_id = '8a200000-0000-4000-8000-000000000003'::uuid),
  'instructor',
  'instructor signup receives the instructor role'
);

select is(
  (select role::text from public.user_profiles where user_id = '8a200000-0000-4000-8000-000000000004'::uuid),
  'company',
  'company signup receives the company role'
);

select is(
  (select role::text from public.user_profiles where user_id = '8a200000-0000-4000-8000-000000000005'::uuid),
  'affiliate',
  'affiliate signup receives the affiliate role'
);

select is(
  (select role::text from public.user_profiles where user_id = '8a200000-0000-4000-8000-000000000006'::uuid),
  'student',
  'unsupported administrative signup falls back to student'
);

select ok(
  exists (
    select 1
    from public.company_profiles
    where owner_user_id = '8a200000-0000-4000-8000-000000000004'::uuid
      and display_name = 'Empresa Unificada'
      and verification_status = 'pending'
  ),
  'company signup provisions a pending company profile'
);

select ok(
  exists (
    select 1
    from public.company_members cm
    join public.company_profiles cp on cp.id = cm.company_id
    where cp.owner_user_id = '8a200000-0000-4000-8000-000000000004'::uuid
      and cm.user_id = cp.owner_user_id
      and cm.member_role = 'owner'
      and cm.status = 'active'
  ),
  'company signup provisions an active owner membership'
);

select ok(
  not exists (
    select 1
    from public.candidate_profiles
    where user_id = '8a200000-0000-4000-8000-000000000004'::uuid
  ),
  'company signup does not provision a candidate profile'
);

select is(
  (
    select count(*)::integer
    from public.candidate_profiles
    where user_id in (
      '8a200000-0000-4000-8000-000000000001'::uuid,
      '8a200000-0000-4000-8000-000000000002'::uuid,
      '8a200000-0000-4000-8000-000000000003'::uuid,
      '8a200000-0000-4000-8000-000000000005'::uuid,
      '8a200000-0000-4000-8000-000000000006'::uuid
    )
  ),
  5,
  'all non-company public signups receive candidate profiles'
);

select ok(
  exists (
    select 1
    from public.candidate_profiles
    where user_id = '8a200000-0000-4000-8000-000000000002'::uuid
      and headline = 'Produtor Musical'
      and experience_years = 8
      and portfolio_url = 'https://example.test/produtor'
      and preferred_roles = array['producer']
  ),
  'producer signup persists applicable professional metadata'
);

select ok(
  exists (
    select 1
    from public.candidate_profiles
    where user_id = '8a200000-0000-4000-8000-000000000003'::uuid
      and skills = array['Produção musical']
      and experience_years = 12
  ),
  'instructor signup persists specialty and experience metadata'
);

select ok(
  exists (
    select 1
    from public.affiliate_profiles
    where user_id = '8a200000-0000-4000-8000-000000000005'::uuid
      and display_name = 'Canal Unificado'
      and status = 'active'
      and referral_code like 'AF-%'
  ),
  'affiliate signup provisions the affiliate profile'
);

select ok(
  not exists (
    select 1
    from public.user_profiles
    where user_id = '8a200000-0000-4000-8000-000000000006'::uuid
      and role::text in ('admin', 'super_admin')
  ),
  'self-signup cannot provision an administrative role'
);

select * from finish();
rollback;
