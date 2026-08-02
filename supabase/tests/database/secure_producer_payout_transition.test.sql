begin;

select plan(12);

select has_function(
  'public',
  'transition_producer_payout',
  array['uuid', 'text'],
  'public payout transition RPC exists'
);

select has_function(
  'app_private',
  'transition_producer_payout',
  array['uuid', 'text'],
  'private payout transition implementation exists'
);

select ok(
  not (
    select p.prosecdef
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'transition_producer_payout'
      and pg_get_function_identity_arguments(p.oid) = 'target_request_id uuid, target_status text'
  ),
  'public payout transition RPC is SECURITY INVOKER'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.transition_producer_payout(uuid,text)',
    'EXECUTE'
  ),
  'authenticated can call the public transition RPC'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.transition_producer_payout(uuid,text)',
    'EXECUTE'
  ),
  'anon cannot call the public transition RPC'
);

select ok(
  has_function_privilege(
    'authenticated',
    'app_private.transition_producer_payout(uuid,text)',
    'EXECUTE'
  ),
  'authenticated can reach the validated private transition implementation'
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
    '9f300000-0000-4000-8000-000000000001'::uuid,
    'authenticated',
    'authenticated',
    'payout-transition-producer@example.test',
    '{}'::jsonb,
    '{"full_name":"Payout Transition Producer"}'::jsonb,
    now(),
    now()
  ),
  (
    '9f300000-0000-4000-8000-000000000002'::uuid,
    'authenticated',
    'authenticated',
    'payout-transition-admin@example.test',
    '{}'::jsonb,
    '{"full_name":"Payout Transition Admin"}'::jsonb,
    now(),
    now()
  );

update public.user_profiles
set full_name = case user_id
      when '9f300000-0000-4000-8000-000000000001'::uuid then 'Payout Transition Producer'
      else 'Payout Transition Admin'
    end,
    role = case user_id
      when '9f300000-0000-4000-8000-000000000001'::uuid then 'producer'::public.user_role
      else 'admin'::public.user_role
    end,
    is_demo = true
where user_id in (
  '9f300000-0000-4000-8000-000000000001'::uuid,
  '9f300000-0000-4000-8000-000000000002'::uuid
);

insert into public.producer_financial_accounts (
  producer_id,
  currency,
  current_balance_cents,
  eligible_balance_cents
) values (
  '9f300000-0000-4000-8000-000000000001'::uuid,
  'BRL',
  5000,
  5000
);

insert into public.producer_payout_methods (
  id,
  producer_id,
  method_type,
  display_label,
  is_default,
  verified
) values (
  '9f400000-0000-4000-8000-000000000001'::uuid,
  '9f300000-0000-4000-8000-000000000001'::uuid,
  'pix',
  'PIX teste transição',
  true,
  true
);

insert into public.producer_payout_requests (
  id,
  producer_id,
  payout_method_id,
  amount_cents,
  currency,
  status
) values (
  '9f500000-0000-4000-8000-000000000001'::uuid,
  '9f300000-0000-4000-8000-000000000001'::uuid,
  '9f400000-0000-4000-8000-000000000001'::uuid,
  5000,
  'BRL',
  'requested'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '9f300000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$select public.transition_producer_payout(
    '9f500000-0000-4000-8000-000000000001'::uuid,
    'canceled'
  )$$,
  'platform staff can cancel a requested payout'
);

select is(
  (
    select current_balance_cents
    from public.producer_financial_accounts
    where producer_id = '9f300000-0000-4000-8000-000000000001'::uuid
  ),
  10000::bigint,
  'canceling a payout restores current balance once'
);

select is(
  (
    select eligible_balance_cents
    from public.producer_financial_accounts
    where producer_id = '9f300000-0000-4000-8000-000000000001'::uuid
  ),
  10000::bigint,
  'canceling a payout restores eligible balance once'
);

select is(
  (
    select status
    from public.producer_payout_requests
    where id = '9f500000-0000-4000-8000-000000000001'::uuid
  ),
  'canceled',
  'canceled payout is persisted as terminal'
);

select throws_ok(
  $$select public.transition_producer_payout(
    '9f500000-0000-4000-8000-000000000001'::uuid,
    'failed'
  )$$,
  '22023',
  'Repasse já está em estado terminal.',
  'terminal payout cannot be transitioned or refunded twice'
);

reset role;

insert into public.producer_payout_requests (
  id,
  producer_id,
  payout_method_id,
  amount_cents,
  currency,
  status
) values (
  '9f500000-0000-4000-8000-000000000002'::uuid,
  '9f300000-0000-4000-8000-000000000001'::uuid,
  '9f400000-0000-4000-8000-000000000001'::uuid,
  1000,
  'BRL',
  'requested'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '9f300000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$select public.transition_producer_payout(
    '9f500000-0000-4000-8000-000000000002'::uuid,
    'paid'
  )$$,
  '22023',
  'Transição de repasse inválida.',
  'requested payout cannot jump directly to paid'
);

reset role;
select * from finish();
rollback;
