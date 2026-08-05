-- Consolidate marketplace and financial RLS policies. Remove legacy
-- permissive overlap, prevent beat-event identity spoofing and repair the
-- ledger participant predicate.

-- Beats and licenses.
drop policy if exists "Published beats are visible" on public.beats;
drop policy if exists "Producers manage their beats" on public.beats;

drop policy if exists "Published beat licenses are visible" on public.beat_licenses;
drop policy if exists "Beat owners manage licenses" on public.beat_licenses;

-- Beat events: anonymous events must remain unattributed; authenticated events
-- may be unattributed or attributed only to the current user.
drop policy if exists "Authenticated users can record beat events" on public.beat_events;
drop policy if exists beat_events_public_insert on public.beat_events;

create policy beat_events_anon_insert
on public.beat_events
for insert
to anon
with check (
  user_id is null
  and exists (
    select 1
    from public.beats as beat
    where beat.id = beat_events.beat_id
      and beat.status = 'published'
  )
);

create policy beat_events_authenticated_insert
on public.beat_events
for insert
to authenticated
with check (
  (user_id is null or user_id = (select auth.uid()))
  and exists (
    select 1
    from public.beats as beat
    where beat.id = beat_events.beat_id
      and beat.status = 'published'
  )
);

drop policy if exists "Producers view events for their beats" on public.beat_events;

-- Beat purchase and delivery reads.
drop policy if exists "Buyers view delivery records" on public.beat_deliveries;
drop policy if exists "Buyers and producers view purchases" on public.beat_license_purchases;
drop policy if exists "Buyers view own order items" on public.beat_order_items;
drop policy if exists "Producers view order items for their beats" on public.beat_order_items;

drop policy if exists "Users view their beat orders" on public.beat_orders;
drop policy if exists beat_orders_owner_read on public.beat_orders;
create policy beat_orders_owner_read
on public.beat_orders
for select
to authenticated
using (
  buyer_id = (select auth.uid())
  or public.is_platform_staff()
);

-- Digital-product orders.
drop policy if exists "Buyers view own digital product order items" on public.digital_product_order_items;
drop policy if exists "Sellers view own digital product order items" on public.digital_product_order_items;
drop policy if exists "Buyers view own digital product orders" on public.digital_product_orders;

-- Producer payouts.
drop policy if exists "Producers view own payout methods" on public.producer_payout_methods;
drop policy if exists "Producers view own payout requests" on public.producer_payout_requests;

-- Ledger: replace the self-comparison `posting.transaction_id = posting.id`
-- with the intended correlation to the current ledger transaction.
drop policy if exists "Users view related ledger transactions" on public.ledger_transactions;
drop policy if exists ledger_transactions_participant_read on public.ledger_transactions;
create policy ledger_transactions_participant_read
on public.ledger_transactions
for select
to authenticated
using (
  public.is_platform_staff()
  or exists (
    select 1
    from public.ledger_postings as posting
    where posting.transaction_id = ledger_transactions.id
      and public.can_read_ledger_account(posting.account_id)
  )
);

-- Financial settings are a singleton (`id = true`). Keep one public read path
-- and the existing admin mutation path; broader/duplicate policies are removed.
drop policy if exists "Authenticated users view platform financial terms" on public.platform_financial_settings;
drop policy if exists platform_financial_settings_staff_update on public.platform_financial_settings;
