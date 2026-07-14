create type public.financial_account_type as enum ('platform_clearing', 'platform_revenue', 'producer_payable');
create type public.ledger_event_type as enum ('beat_sale', 'refund', 'chargeback', 'payout', 'adjustment');
create type public.ledger_transaction_status as enum ('posted', 'reversed');

create table public.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  account_type public.financial_account_type not null,
  owner_user_id uuid references auth.users(id) on delete restrict,
  currency text not null default 'BRL',
  created_at timestamptz not null default now(),
  constraint financial_accounts_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint financial_accounts_owner_check check (
    (account_type = 'producer_payable' and owner_user_id is not null)
    or (account_type in ('platform_clearing', 'platform_revenue') and owner_user_id is null)
  )
);
create unique index financial_accounts_platform_unique on public.financial_accounts (account_type, currency) where owner_user_id is null;
create unique index financial_accounts_producer_unique on public.financial_accounts (account_type, owner_user_id, currency) where owner_user_id is not null;
create index financial_accounts_owner_idx on public.financial_accounts (owner_user_id) where owner_user_id is not null;

create table public.ledger_transactions (
  id uuid primary key default gen_random_uuid(),
  event_type public.ledger_event_type not null,
  status public.ledger_transaction_status not null default 'posted',
  reference_type text not null,
  reference_id uuid not null,
  idempotency_key text not null unique,
  commission_bps integer,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint ledger_transactions_commission_check check (commission_bps is null or commission_bps between 0 and 10000)
);
create index ledger_transactions_reference_idx on public.ledger_transactions (reference_type, reference_id);
create index ledger_transactions_occurred_at_idx on public.ledger_transactions (occurred_at desc);

create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.ledger_transactions(id) on delete restrict,
  account_id uuid not null references public.financial_accounts(id) on delete restrict,
  amount_cents bigint not null,
  created_at timestamptz not null default now(),
  constraint ledger_entries_nonzero_check check (amount_cents <> 0),
  constraint ledger_entries_transaction_account_unique unique (transaction_id, account_id)
);
create index ledger_entries_account_created_idx on public.ledger_entries (account_id, created_at desc);
create index ledger_entries_transaction_idx on public.ledger_entries (transaction_id);

create or replace function public.assert_ledger_transaction_balanced()
returns trigger language plpgsql set search_path = public as $$
declare target_transaction_id uuid;
begin
  target_transaction_id := coalesce(new.transaction_id, old.transaction_id);
  if (select coalesce(sum(amount_cents), 0) from public.ledger_entries where transaction_id = target_transaction_id) <> 0 then
    raise exception 'Ledger transaction % is not balanced', target_transaction_id;
  end if;
  return null;
end;
$$;
revoke all on function public.assert_ledger_transaction_balanced() from public;
create constraint trigger ledger_entries_must_balance
after insert or update or delete on public.ledger_entries
deferrable initially deferred for each row execute function public.assert_ledger_transaction_balanced();

create or replace function public.prevent_financial_ledger_mutation()
returns trigger language plpgsql set search_path = public as $$
begin raise exception 'Posted financial ledger records are immutable'; end;
$$;
revoke all on function public.prevent_financial_ledger_mutation() from public;
create trigger prevent_ledger_transaction_update_delete before update or delete on public.ledger_transactions
for each row execute function public.prevent_financial_ledger_mutation();
create trigger prevent_ledger_entry_update_delete before update or delete on public.ledger_entries
for each row execute function public.prevent_financial_ledger_mutation();

insert into public.financial_accounts (account_type, currency)
values ('platform_clearing', 'BRL'), ('platform_revenue', 'BRL');

create or replace function public.post_beat_sale_to_ledger(target_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  target_order record; producer_row record; ledger_transaction_id uuid;
  clearing_account_id uuid; revenue_account_id uuid; payable_account_id uuid;
  gross_cents bigint; commission_cents bigint; producer_cents bigint;
  commission_rate constant integer := 1500;
begin
  select id, status, currency, paid_at, provider, provider_payment_id into target_order
  from public.beat_orders where id = target_order_id for update;
  if target_order.id is null or target_order.status <> 'paid' then return; end if;

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
    gross_cents := producer_row.gross_cents;
    commission_cents := (gross_cents * commission_rate + 5000) / 10000;
    producer_cents := gross_cents - commission_cents;
    insert into public.financial_accounts (account_type, owner_user_id, currency)
    values ('producer_payable', producer_row.producer_id, target_order.currency)
    on conflict (account_type, owner_user_id, currency) where owner_user_id is not null do nothing;
    select id into payable_account_id from public.financial_accounts
    where account_type = 'producer_payable' and owner_user_id = producer_row.producer_id and currency = target_order.currency;

    insert into public.ledger_transactions (
      event_type, reference_type, reference_id, idempotency_key,
      commission_bps, description, metadata, occurred_at
    ) values (
      'beat_sale', 'beat_order', target_order.id,
      'beat_sale:' || target_order.id::text || ':' || producer_row.producer_id::text,
      commission_rate, 'Venda de beat confirmada',
      jsonb_build_object('producer_id', producer_row.producer_id, 'provider', target_order.provider, 'provider_payment_id', target_order.provider_payment_id),
      coalesce(target_order.paid_at, now())
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

create or replace function public.post_beat_sale_to_ledger_after_paid()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'paid' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    perform public.post_beat_sale_to_ledger(new.id);
  end if;
  return new;
end;
$$;
revoke all on function public.post_beat_sale_to_ledger_after_paid() from public;
create trigger post_beat_sale_to_ledger_after_paid after insert or update of status on public.beat_orders
for each row execute function public.post_beat_sale_to_ledger_after_paid();

alter table public.financial_accounts enable row level security;
alter table public.ledger_transactions enable row level security;
alter table public.ledger_entries enable row level security;
create policy "Users view own financial accounts" on public.financial_accounts for select to authenticated
using (owner_user_id = (select auth.uid()) or public.is_admin());
create policy "Users view ledger entries for own accounts" on public.ledger_entries for select to authenticated
using (exists (
  select 1 from public.financial_accounts account
  where account.id = ledger_entries.account_id
    and (account.owner_user_id = (select auth.uid()) or public.is_admin())
));
create policy "Users view related ledger transactions" on public.ledger_transactions for select to authenticated
using (public.is_admin() or exists (
  select 1 from public.ledger_entries entry
  join public.financial_accounts account on account.id = entry.account_id
  where entry.transaction_id = ledger_transactions.id and account.owner_user_id = (select auth.uid())
));
grant select on public.financial_accounts, public.ledger_transactions, public.ledger_entries to authenticated;
revoke insert, update, delete on public.financial_accounts, public.ledger_transactions, public.ledger_entries from anon, authenticated;

do $$
declare paid_order_id uuid;
begin
  for paid_order_id in select id from public.beat_orders where status = 'paid'
  loop perform public.post_beat_sale_to_ledger(paid_order_id); end loop;
end;
$$;
