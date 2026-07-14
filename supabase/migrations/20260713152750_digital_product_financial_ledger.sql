alter type public.ledger_event_type add value if not exists 'digital_product_sale';

create or replace function public.post_digital_product_sale_to_ledger(target_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order record;
  seller_row record;
  ledger_transaction_id uuid;
  clearing_account_id uuid;
  revenue_account_id uuid;
  payable_account_id uuid;
  gross_cents bigint;
  commission_cents bigint;
  seller_cents bigint;
  commission_rate integer;
  default_rate integer;
begin
  select id, status, currency, paid_at, provider, provider_payment_id into target_order
  from public.digital_product_orders where id = target_order_id for update;
  if target_order.id is null or target_order.status <> 'paid' then return; end if;

  select default_commission_bps into default_rate
  from public.platform_financial_settings where id = true;
  if default_rate is null then raise exception 'Platform financial settings are missing'; end if;

  select id into clearing_account_id from public.financial_accounts
  where account_type = 'platform_clearing' and currency = target_order.currency and owner_user_id is null;
  select id into revenue_account_id from public.financial_accounts
  where account_type = 'platform_revenue' and currency = target_order.currency and owner_user_id is null;
  if clearing_account_id is null or revenue_account_id is null then
    raise exception 'Platform ledger accounts are missing for currency %', target_order.currency;
  end if;

  for seller_row in
    select seller_id, sum(amount_cents)::bigint as gross_cents
    from public.digital_product_order_items where order_id = target_order.id group by seller_id
  loop
    gross_cents := seller_row.gross_cents;
    if gross_cents <= 0 then continue; end if;

    select commission_bps into commission_rate from public.producer_commission_overrides
    where producer_id = seller_row.seller_id
      and effective_from <= coalesce(target_order.paid_at, now())
      and (effective_until is null or effective_until > coalesce(target_order.paid_at, now()));
    commission_rate := coalesce(commission_rate, default_rate);
    commission_cents := (gross_cents * commission_rate + 5000) / 10000;
    seller_cents := gross_cents - commission_cents;

    insert into public.financial_accounts (account_type, owner_user_id, currency)
    values ('producer_payable', seller_row.seller_id, target_order.currency)
    on conflict (account_type, owner_user_id, currency) where owner_user_id is not null do nothing;
    select id into payable_account_id from public.financial_accounts
    where account_type = 'producer_payable' and owner_user_id = seller_row.seller_id and currency = target_order.currency;

    ledger_transaction_id := null;
    insert into public.ledger_transactions (
      event_type, reference_type, reference_id, idempotency_key, commission_bps, description, metadata, occurred_at
    ) values (
      'digital_product_sale', 'digital_product_order', target_order.id,
      'digital_product_sale:' || target_order.id::text || ':' || seller_row.seller_id::text,
      commission_rate, 'Venda de produto digital confirmada',
      jsonb_build_object(
        'producer_id', seller_row.seller_id, 'gross_cents', gross_cents,
        'commission_cents', commission_cents, 'producer_net_cents', seller_cents,
        'provider', target_order.provider, 'provider_payment_id', target_order.provider_payment_id
      ), coalesce(target_order.paid_at, now())
    ) on conflict (idempotency_key) do nothing returning id into ledger_transaction_id;

    if ledger_transaction_id is not null then
      insert into public.ledger_entries (transaction_id, account_id, amount_cents)
      values (ledger_transaction_id, clearing_account_id, gross_cents);
      if commission_cents > 0 then
        insert into public.ledger_entries (transaction_id, account_id, amount_cents)
        values (ledger_transaction_id, revenue_account_id, -commission_cents);
      end if;
      if seller_cents > 0 then
        insert into public.ledger_entries (transaction_id, account_id, amount_cents)
        values (ledger_transaction_id, payable_account_id, -seller_cents);
      end if;
    end if;
  end loop;
end;
$$;

revoke all on function public.post_digital_product_sale_to_ledger(uuid) from public, anon, authenticated;
grant execute on function public.post_digital_product_sale_to_ledger(uuid) to service_role;

create or replace function public.post_digital_product_sale_to_ledger_after_paid()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'paid' and (tg_op = 'INSERT' or old.status is distinct from 'paid') then
    perform public.post_digital_product_sale_to_ledger(new.id);
  end if;
  return new;
end;
$$;

revoke all on function public.post_digital_product_sale_to_ledger_after_paid() from public, anon, authenticated;
create trigger post_digital_product_sale_to_ledger_after_paid
after insert or update of status on public.digital_product_orders
for each row execute function public.post_digital_product_sale_to_ledger_after_paid();
