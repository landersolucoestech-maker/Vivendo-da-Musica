begin;

create or replace function app_private.create_canonical_order(
  target_buyer_id uuid,
  target_offer_ids uuid[],
  target_idempotency_key text,
  target_provider text,
  target_context jsonb,
  target_is_demo boolean
)
returns public.commerce_orders
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  existing public.commerce_orders;
  result public.commerce_orders;
  offer_row record;
  platform_parameter jsonb;
  platform_bps integer;
  platform_amount bigint;
  seller_amount bigint;
  subtotal bigint := 0;
  selected_count integer;
  expected_count integer;
  company_id uuid;
begin
  if target_buyer_id is null then raise exception 'Comprador obrigatório.'; end if;
  if target_offer_ids is null or cardinality(target_offer_ids) = 0 or cardinality(target_offer_ids) > 20 then
    raise exception 'Seleção de ofertas inválida.';
  end if;
  if target_idempotency_key is null or length(trim(target_idempotency_key)) < 16 then
    raise exception 'Chave de idempotência inválida.';
  end if;

  select * into existing from public.commerce_orders where idempotency_key = target_idempotency_key;
  if existing.id is not null then return existing; end if;

  select count(distinct id), cardinality(target_offer_ids)
  into selected_count, expected_count
  from public.commerce_offers
  where id = any(target_offer_ids) and status = 'active';
  if selected_count <> expected_count then raise exception 'Uma ou mais ofertas estão indisponíveis.'; end if;

  if exists (
    select 1 from public.commerce_offers offer
    where offer.id = any(target_offer_ids) and offer.resource_type = 'job_credit_pack'
  ) then
    company_id := nullif(target_context->>'companyId', '')::uuid;
    if company_id is null or not exists (
      select 1 from public.company_members member
      where member.company_id = company_id
        and member.user_id = target_buyer_id
        and member.status = 'active'
    ) then
      raise exception 'Empresa válida obrigatória para adquirir créditos de vagas.';
    end if;
  end if;

  if (select count(distinct offer.currency) from public.commerce_offers offer where offer.id = any(target_offer_ids)) <> 1 then
    raise exception 'Todas as ofertas devem usar a mesma moeda.';
  end if;

  select coalesce(sum(price.amount_cents), 0)
  into subtotal
  from public.commerce_offers offer
  join lateral (
    select current_price.amount_cents
    from public.commerce_offer_prices current_price
    where current_price.offer_id = offer.id
      and current_price.status = 'published'
      and current_price.effective_from <= now()
      and (current_price.effective_until is null or current_price.effective_until > now())
    order by current_price.version desc
    limit 1
  ) price on true
  where offer.id = any(target_offer_ids) and offer.status = 'active';

  insert into public.commerce_orders (
    buyer_id, status, currency, subtotal_cents, discount_cents, tax_cents, total_cents,
    provider, idempotency_key, checkout_snapshot, is_demo
  )
  select
    target_buyer_id, 'pending', min(offer.currency), subtotal, 0, 0, subtotal,
    nullif(trim(coalesce(target_provider, '')), ''), target_idempotency_key,
    coalesce(target_context, '{}'::jsonb) || jsonb_build_object('offerIds', target_offer_ids, 'createdAt', now()),
    target_is_demo
  from public.commerce_offers offer
  where offer.id = any(target_offer_ids)
  returning * into result;

  platform_parameter := public.resolve_commercial_parameter('financial.default_platform_commission_bps');
  platform_bps := greatest(0, least(10000, coalesce((platform_parameter->>'value')::integer, 0)));

  for offer_row in
    select offer.*, price.id as price_id, price.amount_cents, price.version as price_version,
      price.commercial_snapshot as price_snapshot
    from public.commerce_offers offer
    join lateral (
      select current_price.*
      from public.commerce_offer_prices current_price
      where current_price.offer_id = offer.id
        and current_price.status = 'published'
        and current_price.effective_from <= now()
        and (current_price.effective_until is null or current_price.effective_until > now())
      order by current_price.version desc
      limit 1
    ) price on true
    where offer.id = any(target_offer_ids)
    order by offer.id
  loop
    if offer_row.seller_id is null then
      platform_amount := offer_row.amount_cents;
      seller_amount := 0;
    else
      platform_amount := least(
        offer_row.amount_cents,
        round(offer_row.amount_cents::numeric * platform_bps / 10000)::bigint
      );
      seller_amount := offer_row.amount_cents - platform_amount;
    end if;

    insert into public.commerce_order_items (
      order_id, offer_id, offer_price_id, resource_type, resource_id, seller_id,
      title_snapshot, quantity, unit_amount_cents, gross_amount_cents, discount_cents,
      platform_commission_bps, platform_commission_cents,
      affiliate_commission_bps, affiliate_commission_cents, seller_net_cents,
      commercial_snapshot
    ) values (
      result.id, offer_row.id, offer_row.price_id, offer_row.resource_type, offer_row.resource_id,
      offer_row.seller_id, offer_row.title, 1, offer_row.amount_cents, offer_row.amount_cents, 0,
      case when offer_row.seller_id is null then 10000 else platform_bps end,
      platform_amount, 0, 0, seller_amount,
      jsonb_build_object(
        'offerId', offer_row.id,
        'offerPriceId', offer_row.price_id,
        'priceVersion', offer_row.price_version,
        'currency', offer_row.currency,
        'offerMetadata', offer_row.metadata,
        'priceSnapshot', offer_row.price_snapshot,
        'platformParameter', platform_parameter,
        'context', coalesce(target_context, '{}'::jsonb)
      )
    );
  end loop;

  insert into public.commerce_order_events (order_id, event_type, from_status, to_status, metadata)
  values (result.id, 'order_created', null, 'pending', jsonb_build_object('provider', target_provider));

  return result;
end;
$$;

revoke all on function app_private.create_canonical_order(uuid, uuid[], text, text, jsonb, boolean) from public;
grant execute on function app_private.create_canonical_order(uuid, uuid[], text, text, jsonb, boolean) to service_role;

create or replace function public.service_create_canonical_order(
  target_buyer_id uuid,
  target_offer_ids uuid[],
  target_idempotency_key text,
  target_provider text,
  target_context jsonb default '{}'::jsonb,
  target_is_demo boolean default false
)
returns public.commerce_orders
language plpgsql
security invoker
set search_path = public, app_private, pg_temp
as $$
begin
  if (select auth.role()) <> 'service_role' then raise exception 'Acesso de serviço obrigatório.'; end if;
  return app_private.create_canonical_order(
    target_buyer_id, target_offer_ids, target_idempotency_key,
    target_provider, target_context, target_is_demo
  );
end;
$$;

revoke all on function public.service_create_canonical_order(uuid, uuid[], text, text, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.service_create_canonical_order(uuid, uuid[], text, text, jsonb, boolean) to service_role;

create or replace function app_private.confirm_canonical_payment(
  target_order_id uuid,
  target_provider text,
  target_provider_reference text,
  target_payment_method text,
  target_provider_fee_cents bigint,
  target_provider_payload jsonb
)
returns public.payments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_order public.commerce_orders;
  existing public.payments;
  attempt_id uuid;
  result public.payments;
  item_row record;
  delay_days integer;
  available_at timestamptz;
  transaction_id uuid;
  account_id uuid;
  platform_total bigint;
  affiliate_total bigint;
  seller_total bigint;
  credit_total bigint;
begin
  select * into target_order from public.commerce_orders where id = target_order_id for update;
  if target_order.id is null then raise exception 'Pedido não encontrado.'; end if;

  select * into existing
  from public.payments
  where provider = target_provider and provider_reference = target_provider_reference;
  if existing.id is not null then return existing; end if;

  if target_order.status not in ('pending', 'processing') then
    raise exception 'Pedido não permite confirmação de pagamento.';
  end if;
  if target_provider_fee_cents < 0 or target_provider_fee_cents > target_order.total_cents then
    raise exception 'Custo do provedor inválido.';
  end if;

  insert into public.payment_attempts (
    order_id, provider, provider_reference, payment_method, amount_cents,
    currency, status, provider_payload, idempotency_key
  ) values (
    target_order.id, target_provider, target_provider_reference, target_payment_method,
    target_order.total_cents, target_order.currency, 'paid',
    coalesce(target_provider_payload, '{}'::jsonb),
    'payment:' || target_provider || ':' || target_provider_reference
  )
  on conflict (idempotency_key) do update
  set status = 'paid', provider_payload = excluded.provider_payload, updated_at = now()
  returning id into attempt_id;

  insert into public.payments (
    order_id, attempt_id, provider, provider_reference, payment_method,
    gross_amount_cents, provider_fee_cents, net_received_cents,
    currency, status, paid_at, metadata
  ) values (
    target_order.id, attempt_id, target_provider, target_provider_reference,
    target_payment_method, target_order.total_cents, target_provider_fee_cents,
    target_order.total_cents - target_provider_fee_cents,
    target_order.currency, 'paid', now(), coalesce(target_provider_payload, '{}'::jsonb)
  ) returning * into result;

  update public.commerce_orders
  set status = 'paid', provider = target_provider,
      provider_reference = target_provider_reference, paid_at = result.paid_at
  where id = target_order.id;

  delay_days := greatest(
    0,
    coalesce((public.resolve_commercial_parameter('financial.payout_delay_days')->>'value')::integer, 0)
  );
  available_at := result.paid_at + make_interval(days => delay_days);

  for item_row in select * from public.commerce_order_items where order_id = target_order.id loop
    insert into public.revenue_splits (
      order_item_id, beneficiary_type, beneficiary_id, amount_cents,
      percentage_bps, status, available_at, metadata
    ) values (
      item_row.id, 'platform', null, item_row.platform_commission_cents,
      case when item_row.gross_amount_cents - item_row.discount_cents = 0 then 0
           else round(item_row.platform_commission_cents::numeric * 10000 /
             (item_row.gross_amount_cents - item_row.discount_cents))::integer end,
      case when available_at <= now() then 'available' else 'pending' end,
      available_at, jsonb_build_object('source', 'canonical_checkout')
    ) on conflict do nothing;

    if item_row.seller_id is not null and item_row.seller_net_cents > 0 then
      insert into public.revenue_splits (
        order_item_id, beneficiary_type, beneficiary_id, amount_cents,
        percentage_bps, status, available_at, metadata
      ) values (
        item_row.id, 'seller', item_row.seller_id, item_row.seller_net_cents,
        case when item_row.gross_amount_cents - item_row.discount_cents = 0 then 0
             else round(item_row.seller_net_cents::numeric * 10000 /
               (item_row.gross_amount_cents - item_row.discount_cents))::integer end,
        case when item_row.resource_type = 'service' then 'reserved'
             when available_at <= now() then 'available' else 'pending' end,
        case when item_row.resource_type = 'service' then null else available_at end,
        jsonb_build_object('source', 'canonical_checkout')
      ) on conflict do nothing;
    end if;

    insert into public.commerce_entitlements (
      user_id, order_id, order_item_id, resource_type, resource_id,
      status, granted_at, starts_at, expires_at, metadata, is_demo
    )
    select
      target_order.buyer_id, target_order.id, item_row.id,
      item_row.resource_type, item_row.resource_id, 'active',
      result.paid_at, result.paid_at,
      case when offer.access_duration_days is null then null
           else result.paid_at + make_interval(days => offer.access_duration_days) end,
      jsonb_build_object(
        'source', 'canonical_checkout',
        'commercialSnapshot', item_row.commercial_snapshot,
        'companyId', item_row.commercial_snapshot #>> '{context,companyId}'
      ),
      target_order.is_demo
    from public.commerce_offers offer
    where offer.id = item_row.offer_id
    on conflict (user_id, order_item_id, resource_type, resource_id) do nothing;
  end loop;

  insert into public.ledger_transactions (
    event_type, reference_type, reference_id, description,
    currency, metadata, is_demo, occurred_at
  ) values (
    'payment_captured', 'commerce_order', target_order.id, 'Pagamento confirmado',
    target_order.currency,
    jsonb_build_object('provider', target_provider, 'providerReference', target_provider_reference),
    target_order.is_demo, result.paid_at
  ) returning id into transaction_id;

  select coalesce(sum(platform_commission_cents), 0),
         coalesce(sum(affiliate_commission_cents), 0),
         coalesce(sum(seller_net_cents), 0)
  into platform_total, affiliate_total, seller_total
  from public.commerce_order_items where order_id = target_order.id;

  credit_total := platform_total + affiliate_total + seller_total + target_order.tax_cents;
  if credit_total <> target_order.total_cents then
    raise exception 'Pedido desbalanceado: débito %, crédito %', target_order.total_cents, credit_total;
  end if;

  if target_order.total_cents > 0 then
    account_id := app_private.ensure_ledger_account(
      'platform', null, 'cash.received', 'Caixa recebido', target_order.currency, 'debit'
    );
    insert into public.ledger_postings (transaction_id, account_id, direction, amount_cents, memo)
    values (transaction_id, account_id, 'debit', target_order.total_cents, 'Valor bruto recebido');
  end if;

  if platform_total > 0 then
    account_id := app_private.ensure_ledger_account(
      'platform', null, 'revenue.platform', 'Receita da plataforma', target_order.currency, 'credit'
    );
    insert into public.ledger_postings (transaction_id, account_id, direction, amount_cents, memo)
    values (transaction_id, account_id, 'credit', platform_total, 'Comissão da plataforma');
  end if;

  for item_row in
    select seller_id, sum(seller_net_cents)::bigint as amount
    from public.commerce_order_items
    where order_id = target_order.id and seller_id is not null
    group by seller_id having sum(seller_net_cents) > 0
  loop
    account_id := app_private.ensure_ledger_account(
      'user', item_row.seller_id, 'payable.earnings', 'Valores a repassar', target_order.currency, 'credit'
    );
    insert into public.ledger_postings (transaction_id, account_id, direction, amount_cents, memo)
    values (transaction_id, account_id, 'credit', item_row.amount, 'Valor líquido do vendedor');
  end loop;

  if target_provider_fee_cents > 0 then
    account_id := app_private.ensure_ledger_account(
      'provider', null, 'expense.payment_provider', 'Custo do meio de pagamento', target_order.currency, 'debit'
    );
    insert into public.ledger_postings (transaction_id, account_id, direction, amount_cents, memo)
    values (transaction_id, account_id, 'debit', target_provider_fee_cents, 'Taxa do provedor');

    account_id := app_private.ensure_ledger_account(
      'platform', null, 'cash.received', 'Caixa recebido', target_order.currency, 'debit'
    );
    insert into public.ledger_postings (transaction_id, account_id, direction, amount_cents, memo)
    values (transaction_id, account_id, 'credit', target_provider_fee_cents, 'Taxa descontada pelo provedor');
  end if;

  insert into public.commerce_order_events (order_id, event_type, from_status, to_status, metadata)
  values (
    target_order.id, 'payment_confirmed', target_order.status, 'paid',
    jsonb_build_object('paymentId', result.id, 'provider', target_provider)
  );

  return result;
end;
$$;

revoke all on function app_private.confirm_canonical_payment(uuid, text, text, text, bigint, jsonb) from public;
grant execute on function app_private.confirm_canonical_payment(uuid, text, text, text, bigint, jsonb) to service_role;

create or replace function public.service_confirm_canonical_payment(
  target_order_id uuid,
  target_provider text,
  target_provider_reference text,
  target_payment_method text,
  target_provider_fee_cents bigint default 0,
  target_provider_payload jsonb default '{}'::jsonb
)
returns public.payments
language plpgsql
security invoker
set search_path = public, app_private, pg_temp
as $$
begin
  if (select auth.role()) <> 'service_role' then raise exception 'Acesso de serviço obrigatório.'; end if;
  return app_private.confirm_canonical_payment(
    target_order_id, target_provider, target_provider_reference,
    target_payment_method, target_provider_fee_cents, target_provider_payload
  );
end;
$$;

revoke all on function public.service_confirm_canonical_payment(uuid, text, text, text, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.service_confirm_canonical_payment(uuid, text, text, text, bigint, jsonb) to service_role;

create or replace function app_private.fulfill_job_credit_entitlement()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  pack public.job_credit_packs;
  company_id uuid;
  lot_id uuid;
begin
  if new.resource_type <> 'job_credit_pack' or new.status <> 'active' then return new; end if;

  select * into pack from public.job_credit_packs where id = new.resource_id;
  company_id := nullif(new.metadata->>'companyId', '')::uuid;
  if pack.id is null or company_id is null then raise exception 'Dados do pacote de créditos incompletos.'; end if;

  insert into public.company_credit_lots (
    company_id, pack_id, purchased_by, original_credits, remaining_credits,
    price_cents_snapshot, currency, purchased_at, expires_at,
    status, source_order_id, is_demo
  ) values (
    company_id, pack.id, new.user_id, pack.credit_quantity, pack.credit_quantity,
    pack.price_cents, pack.currency, new.granted_at,
    new.granted_at + make_interval(days => pack.validity_days),
    'active', new.order_id, new.is_demo
  )
  on conflict (source_order_id) do nothing
  returning id into lot_id;

  if lot_id is not null then
    insert into public.company_credit_events (
      company_id, lot_id, event_type, quantity, balance_after,
      reference, metadata, created_by, is_demo
    ) values (
      company_id, lot_id, 'purchase', pack.credit_quantity,
      public.company_available_job_credits(company_id),
      'Compra do pacote ' || pack.name,
      jsonb_build_object('orderId', new.order_id, 'entitlementId', new.id),
      new.user_id, new.is_demo
    );
  end if;
  return new;
end;
$$;

revoke all on function app_private.fulfill_job_credit_entitlement() from public, anon, authenticated;

drop trigger if exists fulfill_job_credit_entitlement on public.commerce_entitlements;
create trigger fulfill_job_credit_entitlement
after insert or update of status on public.commerce_entitlements
for each row execute function app_private.fulfill_job_credit_entitlement();

commit;
