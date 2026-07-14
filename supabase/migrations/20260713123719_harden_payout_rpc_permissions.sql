revoke execute on function public.post_beat_sale_to_ledger(uuid) from anon, authenticated;
revoke execute on function public.post_beat_sale_to_ledger_after_paid() from anon, authenticated;

revoke all on function public.request_producer_payout(uuid, bigint, text, text) from public, anon, authenticated, service_role;
drop function public.request_producer_payout(uuid, bigint, text, text);

create or replace function public.request_producer_payout_for_user(
  target_producer_id uuid,
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
  payout_id uuid;
  method_row record;
  settings_row record;
  balance_row record;
  payable_account_id uuid;
  clearing_account_id uuid;
  transaction_id uuid;
  normalized_currency text := upper(target_currency);
begin
  if target_producer_id is null then raise exception 'Producer is required'; end if;
  if requested_amount_cents is null or requested_amount_cents <= 0 then raise exception 'Invalid payout amount'; end if;
  if length(request_idempotency_key) not between 8 and 120 then raise exception 'Invalid idempotency key'; end if;

  select id into payout_id from public.producer_payout_requests
  where producer_id = target_producer_id and idempotency_key = request_idempotency_key;
  if payout_id is not null then return payout_id; end if;

  select * into method_row from public.producer_payout_methods
  where id = target_payout_method_id and producer_id = target_producer_id and status = 'verified'
  for update;
  if method_row.id is null then raise exception 'Verified payout method not found'; end if;

  select * into settings_row from public.platform_financial_settings where id = true;
  if settings_row.id is null then raise exception 'Platform financial settings are missing'; end if;
  if requested_amount_cents < settings_row.payout_minimum_cents then raise exception 'Payout amount is below the platform minimum'; end if;

  select id into payable_account_id from public.financial_accounts
  where account_type = 'producer_payable' and owner_user_id = target_producer_id and currency = normalized_currency
  for update;
  if payable_account_id is null then raise exception 'Producer financial account not found'; end if;

  select * into balance_row from public.get_producer_payout_balance(target_producer_id, normalized_currency);
  if requested_amount_cents > balance_row.eligible_balance_cents then raise exception 'Insufficient eligible payout balance'; end if;

  select id into clearing_account_id from public.financial_accounts
  where account_type = 'platform_clearing' and owner_user_id is null and currency = normalized_currency;
  if clearing_account_id is null then raise exception 'Platform clearing account is missing'; end if;

  insert into public.producer_payout_requests (
    producer_id, payout_method_id, amount_cents, currency, idempotency_key, metadata
  ) values (
    target_producer_id, target_payout_method_id, requested_amount_cents, normalized_currency, request_idempotency_key,
    jsonb_build_object('eligible_balance_cents', balance_row.eligible_balance_cents, 'method_label', method_row.display_label)
  ) returning id into payout_id;

  insert into public.ledger_transactions (
    event_type, reference_type, reference_id, idempotency_key, description, metadata, occurred_at
  ) values (
    'payout', 'producer_payout', payout_id, 'payout_reservation:' || payout_id::text,
    'Repasse reservado para processamento',
    jsonb_build_object('producer_id', target_producer_id, 'payout_method_id', target_payout_method_id, 'status', 'requested'),
    now()
  ) returning id into transaction_id;

  insert into public.ledger_entries (transaction_id, account_id, amount_cents) values
    (transaction_id, payable_account_id, requested_amount_cents),
    (transaction_id, clearing_account_id, -requested_amount_cents);

  return payout_id;
end;
$$;
revoke all on function public.request_producer_payout_for_user(uuid, uuid, bigint, text, text)
  from public, anon, authenticated;
grant execute on function public.request_producer_payout_for_user(uuid, uuid, bigint, text, text)
  to service_role;
