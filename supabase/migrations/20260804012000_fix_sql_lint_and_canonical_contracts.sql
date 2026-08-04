begin;

-- The canonical ledger supports an extensible event vocabulary. The original
-- ledger used an enum, which prevented new commerce, adjustment and payout
-- events from compiling. Preserve all values while moving the shared column to
-- the canonical text contract.
alter table public.ledger_transactions
  alter column event_type type text using event_type::text;

-- Complete the capability lifecycle contract used by profile synchronization
-- and demo activation flows.
alter table public.account_capabilities
  add column if not exists approved_at timestamptz,
  add column if not exists revoked_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.account_capabilities
set approved_at = coalesce(approved_at, activated_at, reviewed_at, created_at)
where status = 'active'
  and approved_at is null;

update public.account_capabilities
set revoked_at = coalesce(revoked_at, reviewed_at, updated_at)
where status in ('suspended', 'rejected')
  and revoked_at is null;

create or replace function public.publish_company_opportunity_with_credit(
  target_company_id uuid,
  target_kind text,
  target_title text,
  target_location text,
  target_engagement_type text,
  target_work_mode text,
  target_description text,
  target_requirements text[],
  target_benefits text[],
  target_salary_min_cents integer,
  target_salary_max_cents integer,
  target_currency text,
  target_application_deadline date
)
returns public.opportunities
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  company public.company_profiles;
  lot public.company_credit_lots;
  opportunity public.opportunities;
  event_id uuid;
  balance integer;
  post_validity_days integer;
  actor_id uuid;
begin
  select * into company
  from public.company_profiles
  where id = target_company_id;

  if company.id is null then
    raise exception 'Empresa não encontrada.';
  end if;

  if (select auth.uid()) is null then
    if not company.is_demo then
      raise exception 'Autenticação obrigatória.';
    end if;
  elsif not public.is_company_member(target_company_id) and not public.is_platform_staff() then
    raise exception 'Usuário sem permissão para publicar por esta empresa.';
  end if;

  if target_kind is null
    or target_kind not in ('job', 'project', 'event', 'collaboration', 'contest', 'other') then
    raise exception 'Tipo de oportunidade inválido.';
  end if;

  if length(trim(coalesce(target_title, ''))) < 3
    or length(trim(coalesce(target_description, ''))) < 20
    or length(trim(coalesce(target_location, ''))) < 2
    or length(trim(coalesce(target_engagement_type, ''))) < 2 then
    raise exception 'Dados obrigatórios da oportunidade são inválidos.';
  end if;

  if target_salary_min_cents is not null and target_salary_min_cents < 0 then
    raise exception 'Valor mínimo inválido.';
  end if;
  if target_salary_max_cents is not null and target_salary_max_cents < 0 then
    raise exception 'Valor máximo inválido.';
  end if;
  if target_salary_min_cents is not null and target_salary_max_cents is not null
    and target_salary_max_cents < target_salary_min_cents then
    raise exception 'Faixa de valores inválida.';
  end if;

  update public.company_credit_lots
  set status = 'expired'
  where company_id = target_company_id
    and status = 'active'
    and expires_at <= now();

  select * into lot
  from public.company_credit_lots
  where company_id = target_company_id
    and status = 'active'
    and remaining_credits > 0
    and expires_at > now()
  order by expires_at asc, created_at asc
  for update skip locked
  limit 1;

  if lot.id is null then
    raise exception 'A empresa não possui créditos disponíveis para publicar a vaga.';
  end if;

  post_validity_days := coalesce(
    (public.resolve_commercial_parameter('jobs.post_validity_days')->>'value')::integer,
    1
  );
  actor_id := coalesce((select auth.uid()), company.owner_user_id);

  insert into public.opportunities (
    company_id,
    created_by,
    kind,
    title,
    organization_name,
    location,
    engagement_type,
    work_mode,
    status,
    description,
    requirements,
    benefits,
    salary_min_cents,
    salary_max_cents,
    currency,
    application_deadline,
    published_at,
    posting_expires_at,
    credit_lot_id,
    is_demo
  ) values (
    target_company_id,
    actor_id,
    target_kind::public.opportunity_kind,
    trim(target_title),
    company.display_name,
    trim(target_location),
    trim(target_engagement_type),
    target_work_mode,
    'open',
    trim(target_description),
    coalesce(target_requirements, '{}'::text[]),
    coalesce(target_benefits, '{}'::text[]),
    target_salary_min_cents,
    target_salary_max_cents,
    upper(coalesce(nullif(trim(target_currency), ''), 'BRL')),
    target_application_deadline,
    now(),
    now() + make_interval(days => greatest(post_validity_days, 1)),
    lot.id,
    company.is_demo
  )
  returning * into opportunity;

  update public.company_credit_lots
  set remaining_credits = remaining_credits - 1,
      status = case when remaining_credits - 1 = 0 then 'exhausted' else 'active' end
  where id = lot.id;

  select coalesce(sum(remaining_credits), 0)::integer
  into balance
  from public.company_credit_lots
  where company_id = target_company_id
    and status = 'active'
    and expires_at > now();

  insert into public.company_credit_events (
    company_id,
    lot_id,
    opportunity_id,
    event_type,
    quantity,
    balance_after,
    reference,
    created_by,
    metadata
  ) values (
    target_company_id,
    lot.id,
    opportunity.id,
    'consume',
    -1,
    balance,
    'Publicação de oportunidade',
    actor_id,
    jsonb_build_object('validityDays', post_validity_days)
  )
  returning id into event_id;

  update public.opportunities
  set credit_event_id = event_id
  where id = opportunity.id
  returning * into opportunity;

  return opportunity;
end;
$$;

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
  target_company_id uuid;
begin
  if target_buyer_id is null then raise exception 'Comprador obrigatório.'; end if;
  if target_offer_ids is null or cardinality(target_offer_ids) = 0 or cardinality(target_offer_ids) > 20 then
    raise exception 'Seleção de ofertas inválida.';
  end if;
  if target_idempotency_key is null or length(trim(target_idempotency_key)) < 16 then
    raise exception 'Chave de idempotência inválida.';
  end if;

  select * into existing
  from public.commerce_orders
  where idempotency_key = target_idempotency_key;
  if existing.id is not null then return existing; end if;

  select count(distinct id), cardinality(target_offer_ids)
  into selected_count, expected_count
  from public.commerce_offers
  where id = any(target_offer_ids)
    and status = 'active';
  if selected_count <> expected_count then
    raise exception 'Uma ou mais ofertas estão indisponíveis.';
  end if;

  if exists (
    select 1
    from public.commerce_offers offer
    where offer.id = any(target_offer_ids)
      and offer.resource_type = 'job_credit_pack'
  ) then
    target_company_id := nullif(target_context->>'companyId', '')::uuid;
    if target_company_id is null or not exists (
      select 1
      from public.company_members member
      where member.company_id = target_company_id
        and member.user_id = target_buyer_id
        and member.status = 'active'
    ) then
      raise exception 'Empresa válida obrigatória para adquirir créditos de vagas.';
    end if;
  end if;

  if (
    select count(distinct offer.currency)
    from public.commerce_offers offer
    where offer.id = any(target_offer_ids)
  ) <> 1 then
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
  where offer.id = any(target_offer_ids)
    and offer.status = 'active';

  insert into public.commerce_orders (
    buyer_id,
    status,
    currency,
    subtotal_cents,
    discount_cents,
    tax_cents,
    total_cents,
    provider,
    idempotency_key,
    checkout_snapshot,
    is_demo
  )
  select
    target_buyer_id,
    'pending',
    min(offer.currency),
    subtotal,
    0,
    0,
    subtotal,
    nullif(trim(coalesce(target_provider, '')), ''),
    target_idempotency_key,
    coalesce(target_context, '{}'::jsonb)
      || jsonb_build_object('offerIds', target_offer_ids, 'createdAt', now()),
    target_is_demo
  from public.commerce_offers offer
  where offer.id = any(target_offer_ids)
  returning * into result;

  platform_parameter := public.resolve_commercial_parameter(
    'financial.default_platform_commission_bps'
  );
  platform_bps := greatest(
    0,
    least(10000, coalesce((platform_parameter->>'value')::integer, 0))
  );

  for offer_row in
    select
      offer.*,
      price.id as price_id,
      price.amount_cents,
      price.version as price_version,
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
      order_id,
      offer_id,
      offer_price_id,
      resource_type,
      resource_id,
      seller_id,
      title_snapshot,
      quantity,
      unit_amount_cents,
      gross_amount_cents,
      discount_cents,
      platform_commission_bps,
      platform_commission_cents,
      affiliate_commission_bps,
      affiliate_commission_cents,
      seller_net_cents,
      commercial_snapshot
    ) values (
      result.id,
      offer_row.id,
      offer_row.price_id,
      offer_row.resource_type,
      offer_row.resource_id,
      offer_row.seller_id,
      offer_row.title,
      1,
      offer_row.amount_cents,
      offer_row.amount_cents,
      0,
      case when offer_row.seller_id is null then 10000 else platform_bps end,
      platform_amount,
      0,
      0,
      seller_amount,
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

  insert into public.commerce_order_events (
    order_id,
    event_type,
    from_status,
    to_status,
    metadata
  ) values (
    result.id,
    'order_created',
    null,
    'pending',
    jsonb_build_object('provider', target_provider)
  );

  return result;
end;
$$;

create or replace function public.admin_set_account_capability(
  target_user_id uuid,
  target_capability text,
  target_status text,
  target_is_default boolean default false
)
returns public.account_capabilities
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  normalized_capability text := lower(trim(coalesce(target_capability, '')));
  normalized_status text := lower(trim(coalesce(target_status, '')));
  result public.account_capabilities;
begin
  if not public.is_platform_staff() then
    raise exception 'Acesso administrativo obrigatório.';
  end if;

  if normalized_capability not in (
    'student', 'instructor', 'producer', 'affiliate',
    'company', 'admin', 'super_admin'
  ) then
    raise exception 'Capacidade inválida.';
  end if;

  if normalized_status not in ('pending', 'active', 'suspended', 'rejected') then
    raise exception 'Status inválido.';
  end if;

  if target_is_default and normalized_status <> 'active' then
    raise exception 'A capacidade padrão deve estar ativa.';
  end if;

  if target_is_default then
    update public.account_capabilities
    set is_default = false
    where user_id = target_user_id;
  end if;

  insert into public.account_capabilities (
    user_id,
    capability,
    status,
    is_default,
    activated_at,
    approved_at,
    revoked_at,
    reviewed_at,
    reviewed_by
  ) values (
    target_user_id,
    normalized_capability,
    normalized_status,
    target_is_default,
    case when normalized_status = 'active' then now() else null end,
    case when normalized_status = 'active' then now() else null end,
    case when normalized_status in ('suspended', 'rejected') then now() else null end,
    now(),
    (select auth.uid())
  )
  on conflict (user_id, capability) do update
  set status = excluded.status,
      is_default = excluded.is_default,
      activated_at = case
        when excluded.status = 'active'
          then coalesce(public.account_capabilities.activated_at, now())
        else public.account_capabilities.activated_at
      end,
      approved_at = case
        when excluded.status = 'active'
          then coalesce(public.account_capabilities.approved_at, now())
        else public.account_capabilities.approved_at
      end,
      revoked_at = case
        when excluded.status in ('suspended', 'rejected') then now()
        else null
      end,
      reviewed_at = now(),
      reviewed_by = (select auth.uid())
  returning * into result;

  if target_is_default and normalized_status = 'active' then
    update public.user_profiles
    set role = normalized_capability::public.user_role
    where user_id = target_user_id;
  end if;

  return result;
end;
$$;

-- Keep the historical manual beat reversal compatible with the canonical text
-- event column. The reversal event table and RPC parameter remain strongly
-- typed by the legacy enum.
create or replace function public.reverse_beat_order_ledger(
  target_order_id uuid,
  reversal_kind public.ledger_event_type,
  provider_event text,
  reversal_amount_cents bigint,
  reversal_currency text,
  reversal_reason text default null
)
returns public.financial_reversal_status
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order record;
  original_transaction record;
  reversal_transaction_id uuid;
  resulting_status public.financial_reversal_status;
begin
  if reversal_kind not in ('refund', 'chargeback') then
    raise exception 'Invalid reversal event type';
  end if;

  select id, status, amount_cents, currency, financial_state
  into target_order
  from public.beat_orders
  where id = target_order_id
  for update;

  if target_order.id is null then raise exception 'Beat order not found'; end if;
  if upper(reversal_currency) <> target_order.currency then
    raise exception 'Reversal currency mismatch';
  end if;

  if exists (
    select 1
    from public.financial_reversal_events
    where provider_event_id = provider_event
  ) then
    return (
      select status
      from public.financial_reversal_events
      where provider_event_id = provider_event
    );
  end if;

  if reversal_amount_cents <> target_order.amount_cents then
    insert into public.financial_reversal_events (
      provider_event_id,
      order_id,
      event_type,
      amount_cents,
      currency,
      status,
      reason
    ) values (
      provider_event,
      target_order.id,
      reversal_kind,
      reversal_amount_cents,
      target_order.currency,
      'manual_review',
      reversal_reason
    );
    return 'manual_review';
  end if;

  if target_order.financial_state in ('refunded', 'disputed') then
    insert into public.financial_reversal_events (
      provider_event_id,
      order_id,
      event_type,
      amount_cents,
      currency,
      status,
      reason
    ) values (
      provider_event,
      target_order.id,
      reversal_kind,
      reversal_amount_cents,
      target_order.currency,
      'ignored',
      'Order already reversed'
    );
    return 'ignored';
  end if;

  for original_transaction in
    select *
    from public.ledger_transactions
    where event_type = 'beat_sale'
      and reference_type = 'beat_order'
      and reference_id = target_order.id
  loop
    insert into public.ledger_transactions (
      event_type,
      reference_type,
      reference_id,
      idempotency_key,
      commission_bps,
      description,
      metadata,
      occurred_at,
      currency,
      is_demo
    ) values (
      reversal_kind::text,
      'beat_order',
      target_order.id,
      reversal_kind::text || ':' || provider_event || ':' || original_transaction.id::text,
      original_transaction.commission_bps,
      case
        when reversal_kind = 'refund' then 'Reembolso integral de venda de beat'
        else 'Chargeback integral de venda de beat'
      end,
      jsonb_build_object(
        'original_transaction_id', original_transaction.id,
        'provider_event_id', provider_event,
        'reason', reversal_reason
      ),
      now(),
      target_order.currency,
      coalesce((select is_demo from public.beat_orders where id = target_order.id), false)
    )
    returning id into reversal_transaction_id;

    insert into public.ledger_entries (
      transaction_id,
      account_id,
      amount_cents
    )
    select reversal_transaction_id, account_id, -amount_cents
    from public.ledger_entries
    where transaction_id = original_transaction.id;
  end loop;

  if reversal_kind = 'refund' then
    update public.beat_orders
    set status = 'refunded', financial_state = 'refunded'
    where id = target_order.id;

    update public.beat_license_purchases
    set status = 'refunded'
    where order_item_id in (
      select id from public.beat_order_items where order_id = target_order.id
    );
  else
    update public.beat_orders
    set financial_state = 'disputed'
    where id = target_order.id;

    update public.beat_license_purchases
    set status = 'revoked'
    where order_item_id in (
      select id from public.beat_order_items where order_id = target_order.id
    );
  end if;

  resulting_status := 'processed';

  insert into public.financial_reversal_events (
    provider_event_id,
    order_id,
    event_type,
    amount_cents,
    currency,
    status,
    reason,
    processed_at
  ) values (
    provider_event,
    target_order.id,
    reversal_kind,
    reversal_amount_cents,
    target_order.currency,
    resulting_status,
    reversal_reason,
    now()
  );

  return resulting_status;
end;
$$;

revoke all on function public.reverse_beat_order_ledger(
  uuid,
  public.ledger_event_type,
  text,
  bigint,
  text,
  text
) from public;

grant execute on function public.reverse_beat_order_ledger(
  uuid,
  public.ledger_event_type,
  text,
  bigint,
  text,
  text
) to service_role;

commit;
