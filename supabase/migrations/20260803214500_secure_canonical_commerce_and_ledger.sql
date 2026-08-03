begin;

create or replace function public.is_affiliate_owner(target_affiliate_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.affiliate_profiles affiliate
    where affiliate.id = target_affiliate_id
      and affiliate.user_id = (select auth.uid())
  );
$$;

create or replace function public.can_read_commerce_order(target_order_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.commerce_orders orders
    where orders.id = target_order_id
      and (
        orders.buyer_id = (select auth.uid())
        or public.is_platform_staff()
      )
  );
$$;

create or replace function public.can_read_ledger_account(target_account_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.ledger_accounts account
    where account.id = target_account_id
      and (
        public.is_platform_staff()
        or (account.owner_type = 'user' and account.owner_id = (select auth.uid()))
        or (account.owner_type = 'affiliate' and public.is_affiliate_owner(account.owner_id))
        or (account.owner_type = 'company' and public.is_company_member(account.owner_id))
      )
  );
$$;

revoke all on function public.is_affiliate_owner(uuid) from public, anon;
grant execute on function public.is_affiliate_owner(uuid) to authenticated, service_role;
revoke all on function public.can_read_commerce_order(uuid) from public, anon;
grant execute on function public.can_read_commerce_order(uuid) to authenticated, service_role;
revoke all on function public.can_read_ledger_account(uuid) from public, anon;
grant execute on function public.can_read_ledger_account(uuid) to authenticated, service_role;

drop trigger if exists set_commerce_offers_updated_at on public.commerce_offers;
create trigger set_commerce_offers_updated_at before update on public.commerce_offers
for each row execute function public.set_updated_at();
drop trigger if exists set_commerce_orders_updated_at on public.commerce_orders;
create trigger set_commerce_orders_updated_at before update on public.commerce_orders
for each row execute function public.set_updated_at();
drop trigger if exists set_payment_attempts_updated_at on public.payment_attempts;
create trigger set_payment_attempts_updated_at before update on public.payment_attempts
for each row execute function public.set_updated_at();
drop trigger if exists set_payments_updated_at on public.payments;
create trigger set_payments_updated_at before update on public.payments
for each row execute function public.set_updated_at();
drop trigger if exists set_commerce_entitlements_updated_at on public.commerce_entitlements;
create trigger set_commerce_entitlements_updated_at before update on public.commerce_entitlements
for each row execute function public.set_updated_at();
drop trigger if exists set_revenue_splits_updated_at on public.revenue_splits;
create trigger set_revenue_splits_updated_at before update on public.revenue_splits
for each row execute function public.set_updated_at();
drop trigger if exists set_payout_destinations_updated_at on public.payout_destinations;
create trigger set_payout_destinations_updated_at before update on public.payout_destinations
for each row execute function public.set_updated_at();
drop trigger if exists set_payout_requests_updated_at on public.payout_requests;
create trigger set_payout_requests_updated_at before update on public.payout_requests
for each row execute function public.set_updated_at();

alter table public.commerce_offers enable row level security;
alter table public.commerce_offer_prices enable row level security;
alter table public.commerce_orders enable row level security;
alter table public.commerce_order_items enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.payments enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.commerce_entitlements enable row level security;
alter table public.revenue_splits enable row level security;
alter table public.ledger_accounts enable row level security;
alter table public.ledger_transactions enable row level security;
alter table public.ledger_postings enable row level security;
alter table public.payout_destinations enable row level security;
alter table public.payout_requests enable row level security;
alter table public.commerce_order_events enable row level security;

create policy commerce_offers_public_read on public.commerce_offers
for select to anon using (status = 'active');
create policy commerce_offers_authenticated_read on public.commerce_offers
for select to authenticated using (status = 'active' or seller_id = (select auth.uid()) or public.is_platform_staff());
create policy commerce_offers_staff_manage on public.commerce_offers
for all to authenticated using (public.is_platform_staff()) with check (public.is_platform_staff());

create policy commerce_offer_prices_public_read on public.commerce_offer_prices
for select to anon using (
  status = 'published' and effective_from <= now() and (effective_until is null or effective_until > now())
  and exists (select 1 from public.commerce_offers offer where offer.id = offer_id and offer.status = 'active')
);
create policy commerce_offer_prices_authenticated_read on public.commerce_offer_prices
for select to authenticated using (
  public.is_platform_staff()
  or exists (select 1 from public.commerce_offers offer where offer.id = offer_id and (offer.status = 'active' or offer.seller_id = (select auth.uid())))
);
create policy commerce_offer_prices_staff_manage on public.commerce_offer_prices
for all to authenticated using (public.is_platform_staff()) with check (public.is_platform_staff());

create policy commerce_orders_owner_read on public.commerce_orders
for select to authenticated using (buyer_id = (select auth.uid()) or public.is_platform_staff());
create policy commerce_orders_demo_read on public.commerce_orders
for select to anon using (is_demo);
create policy commerce_orders_staff_manage on public.commerce_orders
for all to authenticated using (public.is_platform_staff()) with check (public.is_platform_staff());

create policy commerce_order_items_participant_read on public.commerce_order_items
for select to authenticated using (
  seller_id = (select auth.uid()) or public.can_read_commerce_order(order_id) or public.is_platform_staff()
);
create policy commerce_order_items_demo_read on public.commerce_order_items
for select to anon using (exists (select 1 from public.commerce_orders orders where orders.id = order_id and orders.is_demo));
create policy commerce_order_items_staff_manage on public.commerce_order_items
for all to authenticated using (public.is_platform_staff()) with check (public.is_platform_staff());

create policy payment_attempts_owner_read on public.payment_attempts
for select to authenticated using (public.can_read_commerce_order(order_id));
create policy payment_attempts_demo_read on public.payment_attempts
for select to anon using (exists (select 1 from public.commerce_orders orders where orders.id = order_id and orders.is_demo));
create policy payment_attempts_staff_manage on public.payment_attempts
for all to authenticated using (public.is_platform_staff()) with check (public.is_platform_staff());

create policy payments_owner_read on public.payments
for select to authenticated using (public.can_read_commerce_order(order_id));
create policy payments_demo_read on public.payments
for select to anon using (exists (select 1 from public.commerce_orders orders where orders.id = order_id and orders.is_demo));
create policy payments_staff_manage on public.payments
for all to authenticated using (public.is_platform_staff()) with check (public.is_platform_staff());

create policy payment_webhook_events_staff_manage on public.payment_webhook_events
for all to authenticated using (public.is_platform_staff()) with check (public.is_platform_staff());

create policy commerce_entitlements_owner_read on public.commerce_entitlements
for select to authenticated using (user_id = (select auth.uid()) or public.is_platform_staff());
create policy commerce_entitlements_demo_read on public.commerce_entitlements
for select to anon using (is_demo);
create policy commerce_entitlements_staff_manage on public.commerce_entitlements
for all to authenticated using (public.is_platform_staff()) with check (public.is_platform_staff());

create policy revenue_splits_beneficiary_read on public.revenue_splits
for select to authenticated using (
  public.is_platform_staff()
  or (beneficiary_type in ('seller','coproducer') and beneficiary_id = (select auth.uid()))
  or (beneficiary_type = 'affiliate' and public.is_affiliate_owner(beneficiary_id))
);
create policy revenue_splits_demo_read on public.revenue_splits
for select to anon using (
  exists (
    select 1 from public.commerce_order_items item
    join public.commerce_orders orders on orders.id = item.order_id
    where item.id = order_item_id and orders.is_demo
  )
);
create policy revenue_splits_staff_manage on public.revenue_splits
for all to authenticated using (public.is_platform_staff()) with check (public.is_platform_staff());

create policy ledger_accounts_owner_read on public.ledger_accounts
for select to authenticated using (public.can_read_ledger_account(id));
create policy ledger_accounts_staff_manage on public.ledger_accounts
for all to authenticated using (public.is_platform_staff()) with check (public.is_platform_staff());

create policy ledger_transactions_participant_read on public.ledger_transactions
for select to authenticated using (
  public.is_platform_staff()
  or exists (
    select 1 from public.ledger_postings posting
    where posting.transaction_id = id and public.can_read_ledger_account(posting.account_id)
  )
);
create policy ledger_transactions_staff_manage on public.ledger_transactions
for all to authenticated using (public.is_platform_staff()) with check (public.is_platform_staff());

create policy ledger_postings_participant_read on public.ledger_postings
for select to authenticated using (public.can_read_ledger_account(account_id));
create policy ledger_postings_staff_manage on public.ledger_postings
for all to authenticated using (public.is_platform_staff()) with check (public.is_platform_staff());

create policy payout_destinations_owner_read on public.payout_destinations
for select to authenticated using (owner_user_id = (select auth.uid()) or public.is_platform_staff());
create policy payout_destinations_owner_insert on public.payout_destinations
for insert to authenticated with check (owner_user_id = (select auth.uid()) or public.is_platform_staff());
create policy payout_destinations_owner_update on public.payout_destinations
for update to authenticated using (owner_user_id = (select auth.uid()) or public.is_platform_staff()) with check (owner_user_id = (select auth.uid()) or public.is_platform_staff());
create policy payout_destinations_staff_delete on public.payout_destinations
for delete to authenticated using (public.is_platform_staff());

create policy payout_requests_owner_read on public.payout_requests
for select to authenticated using (owner_user_id = (select auth.uid()) or public.is_platform_staff());
create policy payout_requests_owner_insert on public.payout_requests
for insert to authenticated with check (
  owner_user_id = (select auth.uid())
  and exists (select 1 from public.payout_destinations destination where destination.id = destination_id and destination.owner_user_id = (select auth.uid()) and destination.verified and destination.status = 'active')
);
create policy payout_requests_staff_manage on public.payout_requests
for all to authenticated using (public.is_platform_staff()) with check (public.is_platform_staff());

create policy commerce_order_events_owner_read on public.commerce_order_events
for select to authenticated using (public.can_read_commerce_order(order_id));
create policy commerce_order_events_demo_read on public.commerce_order_events
for select to anon using (exists (select 1 from public.commerce_orders orders where orders.id = order_id and orders.is_demo));
create policy commerce_order_events_staff_manage on public.commerce_order_events
for all to authenticated using (public.is_platform_staff()) with check (public.is_platform_staff());

grant select on public.commerce_offers, public.commerce_offer_prices to anon, authenticated;
grant select on public.commerce_orders, public.commerce_order_items, public.payment_attempts, public.payments, public.commerce_entitlements, public.revenue_splits, public.commerce_order_events to anon, authenticated;
grant select on public.payment_webhook_events, public.ledger_accounts, public.ledger_transactions, public.ledger_postings to authenticated;
grant select, insert, update on public.payout_destinations, public.payout_requests to authenticated;
grant insert, update, delete on public.commerce_offers, public.commerce_offer_prices, public.commerce_orders, public.commerce_order_items, public.payment_attempts, public.payments, public.payment_webhook_events, public.commerce_entitlements, public.revenue_splits, public.ledger_accounts, public.ledger_transactions, public.ledger_postings, public.commerce_order_events to authenticated;
grant all on public.commerce_offers, public.commerce_offer_prices, public.commerce_orders, public.commerce_order_items, public.payment_attempts, public.payments, public.payment_webhook_events, public.commerce_entitlements, public.revenue_splits, public.ledger_accounts, public.ledger_transactions, public.ledger_postings, public.payout_destinations, public.payout_requests, public.commerce_order_events to service_role;

commit;
