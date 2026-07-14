create type public.payout_method_type as enum ('pix', 'bank_account');
create type public.payout_method_status as enum ('pending_verification', 'verified', 'disabled');
create type public.payout_status as enum ('requested', 'processing', 'paid', 'failed', 'canceled');
create type public.reconciliation_run_status as enum ('pending', 'completed', 'failed');
create type public.reconciliation_item_status as enum ('matched', 'missing_order', 'amount_mismatch', 'currency_mismatch', 'status_mismatch');

create table public.producer_payout_methods (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references auth.users(id) on delete cascade,
  method_type public.payout_method_type not null,
  provider text not null,
  provider_destination_token text not null,
  display_label text not null,
  status public.payout_method_status not null default 'pending_verification',
  is_default boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint producer_payout_methods_provider_check check (provider ~ '^[a-z0-9_-]{2,40}$'),
  constraint producer_payout_methods_token_check check (length(provider_destination_token) between 8 and 255),
  constraint producer_payout_methods_label_check check (length(display_label) between 3 and 120),
  constraint producer_payout_methods_verification_check check (
    (status = 'verified' and verified_at is not null) or status <> 'verified'
  ),
  unique (provider, provider_destination_token)
);
create unique index producer_payout_methods_default_unique
  on public.producer_payout_methods (producer_id) where is_default and status = 'verified';
create index producer_payout_methods_producer_idx on public.producer_payout_methods (producer_id, status);

create table public.producer_payout_requests (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references auth.users(id) on delete restrict,
  payout_method_id uuid not null references public.producer_payout_methods(id) on delete restrict,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status public.payout_status not null default 'requested',
  idempotency_key text not null,
  provider_transfer_id text,
  failure_code text,
  failure_message text,
  requested_at timestamptz not null default now(),
  processing_at timestamptz,
  paid_at timestamptz,
  failed_at timestamptz,
  canceled_at timestamptz,
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint producer_payout_requests_idempotency_check check (length(idempotency_key) between 8 and 120),
  constraint producer_payout_requests_failure_check check (
    status <> 'failed' or (failed_at is not null and failure_code is not null)
  ),
  constraint producer_payout_requests_paid_check check (
    status <> 'paid' or (paid_at is not null and provider_transfer_id is not null)
  ),
  unique (producer_id, idempotency_key),
  unique (provider_transfer_id)
);
create index producer_payout_requests_producer_idx on public.producer_payout_requests (producer_id, requested_at desc);
create index producer_payout_requests_status_idx on public.producer_payout_requests (status, requested_at);

create table public.payment_reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  status public.reconciliation_run_status not null default 'pending',
  source_reference text,
  total_reported integer not null default 0,
  total_matched integer not null default 0,
  total_divergent integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text,
  created_by uuid references auth.users(id) on delete set null,
  constraint payment_reconciliation_period_check check (period_end > period_start),
  unique (provider, period_start, period_end, source_reference)
);

create table public.payment_reconciliation_reports (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.payment_reconciliation_runs(id) on delete cascade,
  provider_payment_id text not null,
  reported_amount_cents bigint not null check (reported_amount_cents >= 0),
  reported_currency text not null check (reported_currency ~ '^[A-Z]{3}$'),
  reported_status text not null,
  reported_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  unique (run_id, provider_payment_id)
);
create index payment_reconciliation_reports_payment_idx on public.payment_reconciliation_reports (provider_payment_id);

create table public.payment_reconciliation_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.payment_reconciliation_runs(id) on delete cascade,
  report_id uuid not null references public.payment_reconciliation_reports(id) on delete cascade,
  order_id uuid references public.beat_orders(id) on delete restrict,
  status public.reconciliation_item_status not null,
  expected_amount_cents bigint,
  reported_amount_cents bigint not null,
  expected_currency text,
  reported_currency text not null,
  expected_status text,
  reported_status text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (run_id, report_id)
);
create index payment_reconciliation_items_status_idx on public.payment_reconciliation_items (run_id, status);

alter table public.producer_payout_methods enable row level security;
alter table public.producer_payout_requests enable row level security;
alter table public.payment_reconciliation_runs enable row level security;
alter table public.payment_reconciliation_reports enable row level security;
alter table public.payment_reconciliation_items enable row level security;

create policy "Producers view own payout methods" on public.producer_payout_methods
  for select to authenticated
  using (producer_id = (select auth.uid()) or public.is_admin());
create policy "Producers view own payout requests" on public.producer_payout_requests
  for select to authenticated
  using (producer_id = (select auth.uid()) or public.is_admin());
create policy "Admins view reconciliation runs" on public.payment_reconciliation_runs
  for select to authenticated using (public.is_admin());
create policy "Admins view reconciliation reports" on public.payment_reconciliation_reports
  for select to authenticated using (public.is_admin());
create policy "Admins view reconciliation items" on public.payment_reconciliation_items
  for select to authenticated using (public.is_admin());

grant select on public.producer_payout_methods, public.producer_payout_requests to authenticated;
grant select on public.payment_reconciliation_runs, public.payment_reconciliation_reports, public.payment_reconciliation_items to authenticated;
revoke insert, update, delete on public.producer_payout_methods, public.producer_payout_requests,
  public.payment_reconciliation_runs, public.payment_reconciliation_reports, public.payment_reconciliation_items
  from anon, authenticated;
grant all on public.producer_payout_methods, public.producer_payout_requests,
  public.payment_reconciliation_runs, public.payment_reconciliation_reports, public.payment_reconciliation_items
  to service_role;

create or replace function public.get_producer_payout_balance(
  target_producer_id uuid,
  target_currency text default 'BRL'
)
returns table (current_balance_cents bigint, eligible_balance_cents bigint, next_eligibility_at timestamptz)
language sql
security invoker
set search_path = public
as $$
  with settings as (
    select payout_delay_days from public.platform_financial_settings where id = true
  ), account as (
    select id from public.financial_accounts
    where account_type = 'producer_payable'
      and owner_user_id = target_producer_id
      and currency = upper(target_currency)
  ), entries as (
    select le.amount_cents, lt.event_type, lt.occurred_at
    from public.ledger_entries le
    join public.ledger_transactions lt on lt.id = le.transaction_id
    where le.account_id = (select id from account)
  )
  select
    greatest(0, -coalesce(sum(amount_cents), 0))::bigint,
    greatest(0, -coalesce(sum(amount_cents) filter (
      where event_type <> 'beat_sale'
         or occurred_at <= now() - make_interval(days => (select payout_delay_days from settings))
    ), 0))::bigint,
    min(occurred_at + make_interval(days => (select payout_delay_days from settings))) filter (
      where event_type = 'beat_sale'
        and occurred_at > now() - make_interval(days => (select payout_delay_days from settings))
    )
  from entries;
$$;
revoke all on function public.get_producer_payout_balance(uuid, text) from public, anon;
grant execute on function public.get_producer_payout_balance(uuid, text) to authenticated, service_role;

create or replace function public.request_producer_payout(
  target_payout_method_id uuid,
  requested_amount_cents bigint,
  request_idempotency_key text,
  target_currency text default 'BRL'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := (select auth.uid());
  payout_id uuid;
  method_row record;
  settings_row record;
  balance_row record;
  payable_account_id uuid;
  clearing_account_id uuid;
  transaction_id uuid;
  normalized_currency text := upper(target_currency);
begin
  if caller_id is null then raise exception 'Authentication required'; end if;
  if requested_amount_cents is null or requested_amount_cents <= 0 then raise exception 'Invalid payout amount'; end if;
  if length(request_idempotency_key) not between 8 and 120 then raise exception 'Invalid idempotency key'; end if;

  select id into payout_id from public.producer_payout_requests
  where producer_id = caller_id and idempotency_key = request_idempotency_key;
  if payout_id is not null then return payout_id; end if;

  select * into method_row from public.producer_payout_methods
  where id = target_payout_method_id and producer_id = caller_id and status = 'verified'
  for update;
  if method_row.id is null then raise exception 'Verified payout method not found'; end if;

  select * into settings_row from public.platform_financial_settings where id = true;
  if settings_row.id is null then raise exception 'Platform financial settings are missing'; end if;
  if requested_amount_cents < settings_row.payout_minimum_cents then raise exception 'Payout amount is below the platform minimum'; end if;

  select id into payable_account_id from public.financial_accounts
  where account_type = 'producer_payable' and owner_user_id = caller_id and currency = normalized_currency
  for update;
  if payable_account_id is null then raise exception 'Producer financial account not found'; end if;

  select * into balance_row from public.get_producer_payout_balance(caller_id, normalized_currency);
  if requested_amount_cents > balance_row.eligible_balance_cents then raise exception 'Insufficient eligible payout balance'; end if;

  select id into clearing_account_id from public.financial_accounts
  where account_type = 'platform_clearing' and owner_user_id is null and currency = normalized_currency;
  if clearing_account_id is null then raise exception 'Platform clearing account is missing'; end if;

  insert into public.producer_payout_requests (
    producer_id, payout_method_id, amount_cents, currency, idempotency_key,
    metadata
  ) values (
    caller_id, target_payout_method_id, requested_amount_cents, normalized_currency, request_idempotency_key,
    jsonb_build_object('eligible_balance_cents', balance_row.eligible_balance_cents, 'method_label', method_row.display_label)
  ) returning id into payout_id;

  insert into public.ledger_transactions (
    event_type, reference_type, reference_id, idempotency_key, description, metadata, occurred_at
  ) values (
    'payout', 'producer_payout', payout_id, 'payout_reservation:' || payout_id::text,
    'Repasse reservado para processamento',
    jsonb_build_object('producer_id', caller_id, 'payout_method_id', target_payout_method_id, 'status', 'requested'),
    now()
  ) returning id into transaction_id;

  insert into public.ledger_entries (transaction_id, account_id, amount_cents) values
    (transaction_id, payable_account_id, requested_amount_cents),
    (transaction_id, clearing_account_id, -requested_amount_cents);

  return payout_id;
end;
$$;
revoke all on function public.request_producer_payout(uuid, bigint, text, text) from public, anon;
grant execute on function public.request_producer_payout(uuid, bigint, text, text) to authenticated, service_role;

create or replace function public.process_producer_payout(
  target_payout_id uuid,
  target_status public.payout_status,
  target_provider_transfer_id text default null,
  target_failure_code text default null,
  target_failure_message text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  payout_row record;
  payable_account_id uuid;
  clearing_account_id uuid;
  reversal_transaction_id uuid;
begin
  select * into payout_row from public.producer_payout_requests where id = target_payout_id for update;
  if payout_row.id is null then raise exception 'Payout not found'; end if;
  if payout_row.status in ('paid', 'failed', 'canceled') then
    if payout_row.status = target_status then return; end if;
    raise exception 'Payout is already finalized';
  end if;

  if target_status = 'processing' then
    update public.producer_payout_requests set status = 'processing', processing_at = coalesce(processing_at, now()), updated_at = now()
    where id = target_payout_id;
  elsif target_status = 'paid' then
    if target_provider_transfer_id is null or length(target_provider_transfer_id) < 4 then raise exception 'Provider transfer id is required'; end if;
    update public.producer_payout_requests set status = 'paid', provider_transfer_id = target_provider_transfer_id,
      processing_at = coalesce(processing_at, now()), paid_at = now(), updated_at = now()
    where id = target_payout_id;
  elsif target_status in ('failed', 'canceled') then
    if target_status = 'failed' and target_failure_code is null then raise exception 'Failure code is required'; end if;
    select id into payable_account_id from public.financial_accounts
    where account_type = 'producer_payable' and owner_user_id = payout_row.producer_id and currency = payout_row.currency;
    select id into clearing_account_id from public.financial_accounts
    where account_type = 'platform_clearing' and owner_user_id is null and currency = payout_row.currency;
    insert into public.ledger_transactions (
      event_type, reference_type, reference_id, idempotency_key, description, metadata, occurred_at
    ) values (
      'adjustment', 'producer_payout', payout_row.id, 'payout_release:' || payout_row.id::text,
      'Liberacao de repasse nao concluido',
      jsonb_build_object('producer_id', payout_row.producer_id, 'final_status', target_status, 'failure_code', target_failure_code), now()
    ) on conflict (idempotency_key) do nothing returning id into reversal_transaction_id;
    if reversal_transaction_id is not null then
      insert into public.ledger_entries (transaction_id, account_id, amount_cents) values
        (reversal_transaction_id, payable_account_id, -payout_row.amount_cents),
        (reversal_transaction_id, clearing_account_id, payout_row.amount_cents);
    end if;
    update public.producer_payout_requests set status = target_status,
      failure_code = case when target_status = 'failed' then target_failure_code else null end,
      failure_message = case when target_status = 'failed' then target_failure_message else null end,
      failed_at = case when target_status = 'failed' then now() else null end,
      canceled_at = case when target_status = 'canceled' then now() else null end,
      updated_at = now()
    where id = target_payout_id;
  else
    raise exception 'Unsupported payout transition';
  end if;
end;
$$;
revoke all on function public.process_producer_payout(uuid, public.payout_status, text, text, text) from public, anon, authenticated;
grant execute on function public.process_producer_payout(uuid, public.payout_status, text, text, text) to service_role;

create or replace function public.reconcile_beat_payments(target_run_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare run_row record;
begin
  select * into run_row from public.payment_reconciliation_runs where id = target_run_id for update;
  if run_row.id is null then raise exception 'Reconciliation run not found'; end if;
  if run_row.status = 'completed' then return; end if;

  delete from public.payment_reconciliation_items where run_id = target_run_id;
  insert into public.payment_reconciliation_items (
    run_id, report_id, order_id, status,
    expected_amount_cents, reported_amount_cents, expected_currency, reported_currency,
    expected_status, reported_status, details
  )
  select r.run_id, r.id, o.id,
    case
      when o.id is null then 'missing_order'::public.reconciliation_item_status
      when o.amount_cents <> r.reported_amount_cents then 'amount_mismatch'::public.reconciliation_item_status
      when upper(o.currency) <> upper(r.reported_currency) then 'currency_mismatch'::public.reconciliation_item_status
      when (o.status = 'paid') <> (lower(r.reported_status) in ('paid','succeeded','complete')) then 'status_mismatch'::public.reconciliation_item_status
      else 'matched'::public.reconciliation_item_status
    end,
    o.amount_cents, r.reported_amount_cents, o.currency, r.reported_currency,
    o.status::text, r.reported_status,
    jsonb_build_object('provider', run_row.provider, 'provider_payment_id', r.provider_payment_id)
  from public.payment_reconciliation_reports r
  left join public.beat_orders o
    on o.provider = run_row.provider and o.provider_payment_id = r.provider_payment_id
  where r.run_id = target_run_id;

  update public.payment_reconciliation_runs run set
    status = 'completed',
    total_reported = stats.total_reported,
    total_matched = stats.total_matched,
    total_divergent = stats.total_reported - stats.total_matched,
    completed_at = now(), error_message = null
  from (
    select count(*)::integer total_reported,
      count(*) filter (where status = 'matched')::integer total_matched
    from public.payment_reconciliation_items where run_id = target_run_id
  ) stats
  where run.id = target_run_id;
end;
$$;
revoke all on function public.reconcile_beat_payments(uuid) from public, anon, authenticated;
grant execute on function public.reconcile_beat_payments(uuid) to service_role;
