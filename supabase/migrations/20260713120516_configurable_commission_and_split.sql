create table public.platform_financial_settings (
  id boolean primary key default true check (id),
  default_commission_bps integer not null default 1500 check (default_commission_bps between 0 and 10000),
  payout_minimum_cents bigint not null default 5000 check (payout_minimum_cents >= 0),
  payout_delay_days integer not null default 14 check (payout_delay_days between 0 and 365),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
create table public.producer_commission_overrides (
  producer_id uuid primary key references auth.users(id) on delete cascade,
  commission_bps integer not null check (commission_bps between 0 and 10000),
  reason text,
  effective_from timestamptz not null default now(),
  effective_until timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  constraint producer_commission_period_check check (effective_until is null or effective_until > effective_from)
);
create index producer_commission_active_idx on public.producer_commission_overrides (producer_id, effective_from, effective_until);
insert into public.platform_financial_settings (id) values (true);

alter table public.platform_financial_settings enable row level security;
alter table public.producer_commission_overrides enable row level security;
create policy "Authenticated users view platform financial terms" on public.platform_financial_settings for select to authenticated using (true);
create policy "Admins manage platform financial terms" on public.platform_financial_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Producers view own commission override" on public.producer_commission_overrides for select to authenticated
using (producer_id = (select auth.uid()) or public.is_admin());
create policy "Admins manage producer commission overrides" on public.producer_commission_overrides for all to authenticated
using (public.is_admin()) with check (public.is_admin());
grant select on public.platform_financial_settings, public.producer_commission_overrides to authenticated;
grant insert, update, delete on public.platform_financial_settings, public.producer_commission_overrides to authenticated;

create or replace function public.post_beat_sale_to_ledger(target_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  target_order record; producer_row record; ledger_transaction_id uuid;
  clearing_account_id uuid; revenue_account_id uuid; payable_account_id uuid;
  gross_cents bigint; commission_cents bigint; producer_cents bigint;
  commission_rate integer; default_rate integer;
begin
  select id, status, currency, paid_at, provider, provider_payment_id into target_order
  from public.beat_orders where id = target_order_id for update;
  if target_order.id is null or target_order.status <> 'paid' then return; end if;
  select default_commission_bps into default_rate from public.platform_financial_settings where id = true;
  if default_rate is null then raise exception 'Platform financial settings are missing'; end if;
  select id into clearing_account_id from public.financial_accounts
  where account_type = 'platform_clearing' and currency = target_order.currency and owner_user_id is null;
  select id into revenue_account_id from public.financial_accounts
  where account_type = 'platform_revenue' and currency = target_order.currency and owner_user_id is null;
  if clearing_account_id is null or revenue_account_id is null then
    raise exception 'Platform ledger accounts are missing for currency %', target_order.currency;
  end if;

  for producer_row in
    select producer_id, sum(amount_cents)::bigint as gross_cents
    from public.beat_order_items where order_id = target_order.id group by producer_id
  loop
    select commission_bps into commission_rate from public.producer_commission_overrides
    where producer_id = producer_row.producer_id
      and effective_from <= coalesce(target_order.paid_at, now())
      and (effective_until is null or effective_until > coalesce(target_order.paid_at, now()));
    commission_rate := coalesce(commission_rate, default_rate);
    gross_cents := producer_row.gross_cents;
    commission_cents := (gross_cents * commission_rate + 5000) / 10000;
    producer_cents := gross_cents - commission_cents;
    insert into public.financial_accounts (account_type, owner_user_id, currency)
    values ('producer_payable', producer_row.producer_id, target_order.currency)
    on conflict (account_type, owner_user_id, currency) where owner_user_id is not null do nothing;
    select id into payable_account_id from public.financial_accounts
    where account_type = 'producer_payable' and owner_user_id = producer_row.producer_id and currency = target_order.currency;
    insert into public.ledger_transactions (
      event_type, reference_type, reference_id, idempotency_key, commission_bps, description, metadata, occurred_at
    ) values (
      'beat_sale', 'beat_order', target_order.id,
      'beat_sale:' || target_order.id::text || ':' || producer_row.producer_id::text,
      commission_rate, 'Venda de beat confirmada',
      jsonb_build_object(
        'producer_id', producer_row.producer_id, 'gross_cents', gross_cents,
        'commission_cents', commission_cents, 'producer_net_cents', producer_cents,
        'provider', target_order.provider, 'provider_payment_id', target_order.provider_payment_id
      ), coalesce(target_order.paid_at, now())
    ) on conflict (idempotency_key) do nothing returning id into ledger_transaction_id;
    if ledger_transaction_id is not null then
      insert into public.ledger_entries (transaction_id, account_id, amount_cents) values
        (ledger_transaction_id, clearing_account_id, gross_cents),
        (ledger_transaction_id, revenue_account_id, -commission_cents),
        (ledger_transaction_id, payable_account_id, -producer_cents);
    end if;
  end loop;
end;
$$;
revoke all on function public.post_beat_sale_to_ledger(uuid) from public;
