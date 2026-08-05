begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

with effective_policies as (
  select
    policy.tablename,
    policy.policyname,
    policy.cmd,
    effective_role.role_name
  from pg_policies as policy
  cross join (values ('anon'::name), ('authenticated'::name)) as effective_role(role_name)
  where policy.schemaname = 'public'
    and policy.tablename in (
      'beats',
      'beat_licenses',
      'beat_events',
      'beat_orders',
      'beat_order_items',
      'beat_license_purchases',
      'beat_deliveries',
      'digital_product_orders',
      'digital_product_order_items',
      'ledger_transactions',
      'producer_payout_methods',
      'producer_payout_requests',
      'platform_financial_settings'
    )
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
  'marketplace and financial policies are unique per effective role and action'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename = 'beat_events'
      and policyname = 'beat_events_anon_insert'
      and with_check ilike '%user_id IS NULL%'
  ),
  1::bigint,
  'anonymous beat events cannot claim a user identity'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename = 'beat_events'
      and policyname = 'beat_events_authenticated_insert'
      and with_check ilike '%user_id = ( SELECT auth.uid()%'
  ),
  1::bigint,
  'authenticated beat events can only use the caller identity'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename = 'beat_events'
      and policyname in (
        'Authenticated users can record beat events',
        'beat_events_public_insert'
      )
  ),
  0::bigint,
  'legacy beat-event insert policies are absent'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ledger_transactions'
      and policyname = 'ledger_transactions_participant_read'
      and qual ilike '%posting.transaction_id = ledger_transactions.id%'
  ),
  1::bigint,
  'ledger participant reads correlate postings to the current transaction'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ledger_transactions'
      and policyname = 'ledger_transactions_participant_read'
      and qual ilike '%posting.transaction_id = posting.id%'
  ),
  0::bigint,
  'ledger participant reads do not compare posting transaction and posting IDs'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename = 'beat_orders'
      and policyname = 'beat_orders_owner_read'
      and qual ilike '%is_platform_staff()%'
  ),
  1::bigint,
  'platform staff retain beat-order read access'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename in ('ledger_transactions', 'platform_financial_settings')
      and cmd = 'ALL'
  ),
  0::bigint,
  'financial administrative policies do not use ALL'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename = 'platform_financial_settings'
      and policyname = 'financial_settings_read'
      and cmd = 'SELECT'
      and 'anon' = any(roles)
      and 'authenticated' = any(roles)
  ),
  1::bigint,
  'financial settings use one singleton read policy'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename = 'platform_financial_settings'
      and policyname in (
        'platform_financial_settings_staff_insert',
        'platform_financial_settings_staff_update',
        'platform_financial_settings_staff_delete'
      )
  ),
  3::bigint,
  'financial settings retain explicit staff mutation policies'
);

select * from finish();
rollback;
