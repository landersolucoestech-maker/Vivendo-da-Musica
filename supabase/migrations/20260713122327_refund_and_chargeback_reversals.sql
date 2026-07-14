create type public.beat_order_financial_state as enum ('normal', 'refunded', 'disputed', 'recovered');
create type public.financial_reversal_status as enum ('processed', 'manual_review', 'ignored');
alter table public.beat_orders add column financial_state public.beat_order_financial_state not null default 'normal';

create table public.financial_reversal_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'stripe',
  provider_event_id text not null unique,
  order_id uuid not null references public.beat_orders(id) on delete restrict,
  event_type public.ledger_event_type not null check (event_type in ('refund', 'chargeback')),
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status public.financial_reversal_status not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);
create index financial_reversal_order_idx on public.financial_reversal_events (order_id, created_at desc);
create index financial_reversal_status_idx on public.financial_reversal_events (status, created_at);
alter table public.financial_reversal_events enable row level security;
create policy "Admins view financial reversals" on public.financial_reversal_events for select to authenticated using (public.is_admin());
grant select on public.financial_reversal_events to authenticated;
revoke insert, update, delete on public.financial_reversal_events from anon, authenticated;

create or replace function public.reverse_beat_order_ledger(
  target_order_id uuid,
  reversal_kind public.ledger_event_type,
  provider_event text,
  reversal_amount_cents bigint,
  reversal_currency text,
  reversal_reason text default null
)
returns public.financial_reversal_status
language plpgsql security definer set search_path = public as $$
declare
  target_order record;
  original_transaction record;
  reversal_transaction_id uuid;
  resulting_status public.financial_reversal_status;
begin
  if reversal_kind not in ('refund', 'chargeback') then raise exception 'Invalid reversal event type'; end if;
  select id, status, amount_cents, currency, financial_state into target_order
  from public.beat_orders where id = target_order_id for update;
  if target_order.id is null then raise exception 'Beat order not found'; end if;
  if upper(reversal_currency) <> target_order.currency then raise exception 'Reversal currency mismatch'; end if;
  if exists (select 1 from public.financial_reversal_events where provider_event_id = provider_event) then
    return (select status from public.financial_reversal_events where provider_event_id = provider_event);
  end if;
  if reversal_amount_cents <> target_order.amount_cents then
    insert into public.financial_reversal_events (
      provider_event_id, order_id, event_type, amount_cents, currency, status, reason
    ) values (
      provider_event, target_order.id, reversal_kind, reversal_amount_cents,
      target_order.currency, 'manual_review', reversal_reason
    );
    return 'manual_review';
  end if;
  if target_order.financial_state in ('refunded', 'disputed') then
    insert into public.financial_reversal_events (
      provider_event_id, order_id, event_type, amount_cents, currency, status, reason
    ) values (
      provider_event, target_order.id, reversal_kind, reversal_amount_cents,
      target_order.currency, 'ignored', 'Order already reversed'
    );
    return 'ignored';
  end if;
  for original_transaction in
    select * from public.ledger_transactions
    where event_type = 'beat_sale' and reference_type = 'beat_order' and reference_id = target_order.id
  loop
    insert into public.ledger_transactions (
      event_type, reference_type, reference_id, idempotency_key,
      commission_bps, description, metadata, occurred_at
    ) values (
      reversal_kind, 'beat_order', target_order.id,
      reversal_kind::text || ':' || provider_event || ':' || original_transaction.id::text,
      original_transaction.commission_bps,
      case when reversal_kind = 'refund' then 'Reembolso integral de venda de beat' else 'Chargeback integral de venda de beat' end,
      jsonb_build_object('original_transaction_id', original_transaction.id, 'provider_event_id', provider_event, 'reason', reversal_reason),
      now()
    ) returning id into reversal_transaction_id;
    insert into public.ledger_entries (transaction_id, account_id, amount_cents)
    select reversal_transaction_id, account_id, -amount_cents
    from public.ledger_entries where transaction_id = original_transaction.id;
  end loop;
  if reversal_kind = 'refund' then
    update public.beat_orders set status = 'refunded', financial_state = 'refunded' where id = target_order.id;
    update public.beat_license_purchases set status = 'refunded'
    where order_item_id in (select id from public.beat_order_items where order_id = target_order.id);
  else
    update public.beat_orders set financial_state = 'disputed' where id = target_order.id;
    update public.beat_license_purchases set status = 'revoked'
    where order_item_id in (select id from public.beat_order_items where order_id = target_order.id);
  end if;
  resulting_status := 'processed';
  insert into public.financial_reversal_events (
    provider_event_id, order_id, event_type, amount_cents, currency, status, reason, processed_at
  ) values (
    provider_event, target_order.id, reversal_kind, reversal_amount_cents,
    target_order.currency, resulting_status, reversal_reason, now()
  );
  return resulting_status;
end;
$$;
revoke all on function public.reverse_beat_order_ledger(uuid, public.ledger_event_type, text, bigint, text, text) from public;
