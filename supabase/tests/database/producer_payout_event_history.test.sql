begin;

select plan(10);

select has_table(
  'public',
  'producer_payout_events',
  'producer payout event history table exists'
);

select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.producer_payout_events'::regclass
  ),
  'producer payout event history has RLS enabled'
);

select ok(
  has_table_privilege('authenticated', 'public.producer_payout_events', 'SELECT'),
  'authenticated users can select payout events subject to RLS'
);

select ok(
  not has_table_privilege('authenticated', 'public.producer_payout_events', 'INSERT'),
  'authenticated users cannot insert payout events directly'
);

select ok(
  not has_table_privilege('authenticated', 'public.producer_payout_events', 'UPDATE'),
  'authenticated users cannot update payout events'
);

-- user_profiles retains its historical FK to auth.users. Build valid auth
-- identities first and let the provisioning trigger create the base profiles.
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
    '9fc00000-0000-4000-8000-000000000001'::uuid,
    'authenticated',
    'authenticated',
    'payout-event-producer@example.test',
    '{}'::jsonb,
    '{"full_name":"Payout Event Producer"}'::jsonb,
    now(),
    now()
  ),
  (
    '9fc00000-0000-4000-8000-000000000002'::uuid,
    'authenticated',
    'authenticated',
    'payout-event-admin@example.test',
    '{}'::jsonb,
    '{"full_name":"Payout Event Admin"}'::jsonb,
    now(),
    now()
  );

update public.user_profiles
set full_name = case user_id
      when '9fc00000-0000-4000-8000-000000000001'::uuid then 'Payout Event Producer'
      else 'Payout Event Admin'
    end,
    role = case user_id
      when '9fc00000-0000-4000-8000-000000000001'::uuid then 'producer'::public.user_role
      else 'admin'::public.user_role
    end,
    is_demo = true
where user_id in (
  '9fc00000-0000-4000-8000-000000000001'::uuid,
  '9fc00000-0000-4000-8000-000000000002'::uuid
);

insert into public.producer_financial_accounts (
  producer_id,
  currency,
  current_balance_cents,
  eligible_balance_cents
) values (
  '9fc00000-0000-4000-8000-000000000001'::uuid,
  'BRL',
  10000,
  10000
);

insert into public.producer_payout_methods (
  id,
  producer_id,
  method_type,
  display_label,
  is_default,
  verified
) values (
  '9fd00000-0000-4000-8000-000000000001'::uuid,
  '9fc00000-0000-4000-8000-000000000001'::uuid,
  'pix',
  'PIX teste de auditoria',
  true,
  true
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '9fc00000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

create temporary table payout_event_test_context (payout_id uuid not null) on commit drop;

insert into payout_event_test_context (payout_id)
select public.request_producer_payout(
  '9fd00000-0000-4000-8000-000000000001'::uuid,
  5000,
  'BRL'
);

select set_config('request.jwt.claim.sub', '9fc00000-0000-4000-8000-000000000002', true);

select lives_ok(
  $$select public.transition_producer_payout(
    (select payout_id from payout_event_test_context),
    'processing'
  )$$,
  'admin transition creates an audit event'
);

select is(
  (
    select count(*)
    from public.producer_payout_events
    where payout_request_id = (select payout_id from payout_event_test_context)
  ),
  2::bigint,
  'request and transition create exactly two payout events'
);

select is(
  (
    select count(*)
    from public.producer_payout_events
    where payout_request_id = (select payout_id from payout_event_test_context)
      and actor_role = 'producer'
      and from_status is null
      and to_status = 'requested'
  ),
  1::bigint,
  'request event records the producer actor and initial status'
);

select is(
  (
    select count(*)
    from public.producer_payout_events
    where payout_request_id = (select payout_id from payout_event_test_context)
      and actor_role = 'admin'
      and from_status = 'requested'
      and to_status = 'processing'
  ),
  1::bigint,
  'transition event records the admin actor and status change'
);

reset role;

update public.producer_payout_requests
set status = status
where id = (select payout_id from payout_event_test_context);

select is(
  (
    select count(*)
    from public.producer_payout_events
    where payout_request_id = (select payout_id from payout_event_test_context)
  ),
  2::bigint,
  'no-op status updates do not create duplicate events'
);

select * from finish();
rollback;
