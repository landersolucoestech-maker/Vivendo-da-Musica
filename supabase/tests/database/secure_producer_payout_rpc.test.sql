begin;

select plan(15);

select has_function(
  'public',
  'request_producer_payout',
  array['uuid', 'bigint', 'text'],
  'public producer payout RPC exists'
);

select has_function(
  'app_private',
  'request_producer_payout',
  array['uuid', 'bigint', 'text'],
  'private producer payout implementation exists'
);

select ok(
  not (
    select p.prosecdef
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'request_producer_payout'
      and pg_get_function_identity_arguments(p.oid) = 'target_method_id uuid, requested_amount_cents bigint, requested_currency text'
  ),
  'public producer payout RPC is SECURITY INVOKER'
);

select is(
  (
    select p.proconfig::text
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'request_producer_payout'
      and pg_get_function_identity_arguments(p.oid) = 'target_method_id uuid, requested_amount_cents bigint, requested_currency text'
  ),
  '{"search_path=public, app_private, pg_temp"}',
  'public producer payout RPC has a fixed search_path'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.request_producer_payout(uuid,bigint,text)',
    'EXECUTE'
  ),
  'authenticated can execute the public producer payout RPC'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.request_producer_payout(uuid,bigint,text)',
    'EXECUTE'
  ),
  'anon cannot execute the public producer payout RPC'
);

select ok(
  has_function_privilege(
    'authenticated',
    'app_private.request_producer_payout(uuid,bigint,text)',
    'EXECUTE'
  ),
  'authenticated can reach the validated private implementation through the invoker wrapper'
);

select ok(
  has_function_privilege(
    'service_role',
    'app_private.request_producer_payout(uuid,bigint,text)',
    'EXECUTE'
  ),
  'service_role can execute the private implementation'
);

select ok(
  has_schema_privilege('authenticated', 'app_private', 'USAGE'),
  'authenticated can resolve the non-exposed private schema through the invoker wrapper'
);

select ok(
  has_schema_privilege('service_role', 'app_private', 'USAGE'),
  'service_role has usage on the private schema'
);

insert into public.user_profiles (user_id, full_name, role, is_demo)
values ('9f100000-0000-4000-8000-000000000001'::uuid, 'RPC Payout Test Producer', 'producer', true);

insert into public.producer_financial_accounts (
  producer_id,
  currency,
  current_balance_cents,
  eligible_balance_cents
) values (
  '9f100000-0000-4000-8000-000000000001'::uuid,
  'BRL',
  20000,
  15000
);

insert into public.producer_payout_methods (
  id,
  producer_id,
  method_type,
  display_label,
  is_default,
  verified
) values (
  '9f200000-0000-4000-8000-000000000001'::uuid,
  '9f100000-0000-4000-8000-000000000001'::uuid,
  'pix',
  'PIX teste',
  true,
  true
);

insert into public.platform_financial_settings (
  id,
  default_commission_bps,
  payout_minimum_cents,
  payout_delay_days
) values (
  true,
  1500,
  5000,
  14
)
on conflict (id) do update
set payout_minimum_cents = excluded.payout_minimum_cents;

set local role authenticated;
select set_config('request.jwt.claim.sub', '9f100000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$select public.request_producer_payout(
    '9f200000-0000-4000-8000-000000000001'::uuid,
    5000,
    'brl'
  )$$,
  'authenticated producer can request an eligible payout'
);

select is(
  (
    select current_balance_cents
    from public.producer_financial_accounts
    where producer_id = '9f100000-0000-4000-8000-000000000001'::uuid
  ),
  15000::bigint,
  'payout atomically reduces current balance'
);

select is(
  (
    select eligible_balance_cents
    from public.producer_financial_accounts
    where producer_id = '9f100000-0000-4000-8000-000000000001'::uuid
  ),
  10000::bigint,
  'payout atomically reduces eligible balance'
);

select is(
  (
    select count(*)
    from public.producer_payout_requests
    where producer_id = '9f100000-0000-4000-8000-000000000001'::uuid
      and amount_cents = 5000
      and currency = 'BRL'
      and status = 'requested'
  ),
  1::bigint,
  'payout request is persisted with normalized currency and requested status'
);

select throws_ok(
  $$select public.request_producer_payout(
    '9f200000-0000-4000-8000-000000000001'::uuid,
    5000,
    'BRL'
  )$$,
  '23505',
  'Já existe um repasse pendente ou em processamento.',
  'a second pending payout request is rejected'
);

reset role;
select * from finish();
rollback;
