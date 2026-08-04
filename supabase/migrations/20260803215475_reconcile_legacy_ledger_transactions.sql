-- Reconcile the original beat/product double-entry ledger with the canonical
-- commerce ledger introduced later. The original table must be evolved in
-- place because historical entries and reversal metadata already reference it.

alter type public.ledger_event_type add value if not exists 'payment_captured';

alter table public.ledger_transactions
  add column if not exists currency text not null default 'BRL',
  add column if not exists is_demo boolean not null default false;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ledger_transactions'
      and column_name = 'idempotency_key'
  ) then
    execute $sql$
      alter table public.ledger_transactions
      alter column idempotency_key set default ('canonical:' || gen_random_uuid()::text)
    $sql$;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.ledger_transactions'::regclass
      and conname = 'ledger_transactions_currency_check'
  ) then
    alter table public.ledger_transactions
      add constraint ledger_transactions_currency_check
      check (currency ~ '^[A-Z]{3}$');
  end if;
end;
$$;

create table if not exists app_private.legacy_ledger_transaction_aliases (
  legacy_transaction_id uuid primary key,
  retained_transaction_id uuid not null references public.ledger_transactions(id) on delete restrict,
  merged_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

revoke all on app_private.legacy_ledger_transaction_aliases from public, anon, authenticated;
grant select, insert on app_private.legacy_ledger_transaction_aliases to service_role;

-- The canonical order synchronizer becomes the only automatic order-to-ledger
-- writer. Manual reversal remains available for historical beat transactions.
drop trigger if exists post_beat_sale_to_ledger_after_paid on public.beat_orders;
drop trigger if exists post_digital_product_sale_to_ledger_after_paid on public.digital_product_orders;

-- Existing releases could contain one legacy transaction per seller for the
-- same order. The canonical contract requires one transaction per event and
-- reference, so merge duplicate transactions while preserving an alias map.
create temporary table legacy_ledger_duplicate_map on commit drop as
with ranked as (
  select
    transaction.id as legacy_transaction_id,
    first_value(transaction.id) over (
      partition by transaction.event_type, transaction.reference_type, transaction.reference_id
      order by transaction.created_at, transaction.id
    ) as retained_transaction_id,
    row_number() over (
      partition by transaction.event_type, transaction.reference_type, transaction.reference_id
      order by transaction.created_at, transaction.id
    ) as occurrence
  from public.ledger_transactions transaction
)
select legacy_transaction_id, retained_transaction_id
from ranked
where occurrence > 1;

insert into app_private.legacy_ledger_transaction_aliases (
  legacy_transaction_id,
  retained_transaction_id,
  metadata
)
select
  duplicate.legacy_transaction_id,
  duplicate.retained_transaction_id,
  jsonb_build_object('reason', 'canonical_event_reference_deduplication')
from legacy_ledger_duplicate_map duplicate
on conflict (legacy_transaction_id) do update
set retained_transaction_id = excluded.retained_transaction_id,
    metadata = app_private.legacy_ledger_transaction_aliases.metadata || excluded.metadata;

do $$
begin
  if exists (
    select 1 from pg_trigger
    where tgrelid = 'public.ledger_entries'::regclass
      and tgname = 'prevent_ledger_entry_update_delete'
      and not tgisinternal
  ) then
    alter table public.ledger_entries disable trigger prevent_ledger_entry_update_delete;
  end if;

  if exists (
    select 1 from pg_trigger
    where tgrelid = 'public.ledger_transactions'::regclass
      and tgname = 'prevent_ledger_transaction_update_delete'
      and not tgisinternal
  ) then
    alter table public.ledger_transactions disable trigger prevent_ledger_transaction_update_delete;
  end if;
end;
$$;

-- Preserve the accounting effect of every merged transaction. Equal accounts
-- are aggregated into the retained transaction; different payable accounts
-- remain separate postings.
insert into public.ledger_entries (
  transaction_id,
  account_id,
  amount_cents,
  created_at
)
select
  duplicate.retained_transaction_id,
  entry.account_id,
  sum(entry.amount_cents)::bigint,
  min(entry.created_at)
from public.ledger_entries entry
join legacy_ledger_duplicate_map duplicate
  on duplicate.legacy_transaction_id = entry.transaction_id
group by duplicate.retained_transaction_id, entry.account_id
on conflict (transaction_id, account_id) do update
set amount_cents = public.ledger_entries.amount_cents + excluded.amount_cents,
    created_at = least(public.ledger_entries.created_at, excluded.created_at);

delete from public.ledger_entries entry
using legacy_ledger_duplicate_map duplicate
where entry.transaction_id = duplicate.legacy_transaction_id;

delete from public.ledger_transactions transaction
using legacy_ledger_duplicate_map duplicate
where transaction.id = duplicate.legacy_transaction_id;

-- Recover the original transaction currency/demo provenance where the source
-- order remains available. The default remains BRL/non-demo for older records
-- without a resolvable source order.
update public.ledger_transactions transaction
set currency = upper(orders.currency),
    is_demo = coalesce(orders.is_demo, false)
from public.beat_orders orders
where transaction.reference_type = 'beat_order'
  and transaction.reference_id = orders.id;

update public.ledger_transactions transaction
set currency = upper(orders.currency),
    is_demo = coalesce(orders.is_demo, false)
from public.digital_product_orders orders
where transaction.reference_type = 'digital_product_order'
  and transaction.reference_id = orders.id;

do $$
begin
  if exists (
    select 1 from pg_trigger
    where tgrelid = 'public.ledger_entries'::regclass
      and tgname = 'prevent_ledger_entry_update_delete'
      and not tgisinternal
  ) then
    alter table public.ledger_entries enable trigger prevent_ledger_entry_update_delete;
  end if;

  if exists (
    select 1 from pg_trigger
    where tgrelid = 'public.ledger_transactions'::regclass
      and tgname = 'prevent_ledger_transaction_update_delete'
      and not tgisinternal
  ) then
    alter table public.ledger_transactions enable trigger prevent_ledger_transaction_update_delete;
  end if;
end;
$$;

create unique index if not exists ledger_transactions_event_reference_unique_idx
on public.ledger_transactions (event_type, reference_type, reference_id);

create index if not exists ledger_transactions_currency_occurred_idx
on public.ledger_transactions (currency, occurred_at desc);
