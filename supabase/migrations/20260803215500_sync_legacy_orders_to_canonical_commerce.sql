begin;

create or replace view app_private.legacy_commerce_orders as
select 'course'::text as source_kind,id as source_id,user_id as buyer_id,status,provider,provider_reference,amount_cents::bigint,currency,is_demo,paid_at,created_at,updated_at
from public.course_orders
union all
select 'digital_product',id,buyer_id,status,provider,provider_reference,amount_cents::bigint,currency,is_demo,paid_at,created_at,updated_at
from public.digital_product_orders
union all
select 'beat',id,buyer_id,status,provider,provider_reference,amount_cents::bigint,currency,is_demo,paid_at,created_at,updated_at
from public.beat_orders;

create or replace view app_private.legacy_commerce_order_items as
select 'course'::text as source_kind,item.id as source_item_id,item.order_id as source_order_id,
  'course'::text as resource_type,item.course_id as resource_id,course.instructor_id as seller_id,
  item.course_title_snapshot as title_snapshot,item.amount_cents::bigint,item.currency,item.created_at
from public.course_order_items item
join public.courses course on course.id=item.course_id
union all
select 'digital_product',item.id,item.order_id,'digital_product',item.product_id,item.seller_id,
  item.product_title_snapshot,item.amount_cents::bigint,item.currency,item.created_at
from public.digital_product_order_items item
union all
select 'beat',item.id,item.order_id,'beat_license',item.license_id,item.producer_id,
  item.beat_title_snapshot || ' — ' || item.license_name_snapshot,item.amount_cents::bigint,item.currency,item.created_at
from public.beat_order_items item;

revoke all on app_private.legacy_commerce_orders from public, anon, authenticated;
revoke all on app_private.legacy_commerce_order_items from public, anon, authenticated;
grant select on app_private.legacy_commerce_orders, app_private.legacy_commerce_order_items to service_role;

create or replace function app_private.ensure_ledger_account(
  target_owner_type text,
  target_owner_id uuid,
  target_account_code text,
  target_name text,
  target_currency text,
  target_normal_balance text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  account_id uuid;
begin
  select id into account_id
  from public.ledger_accounts
  where owner_type=target_owner_type
    and owner_id is not distinct from target_owner_id
    and account_code=target_account_code
    and currency=upper(target_currency)
  limit 1;

  if account_id is null then
    insert into public.ledger_accounts(owner_type,owner_id,account_code,name,currency,normal_balance)
    values(target_owner_type,target_owner_id,target_account_code,target_name,upper(target_currency),target_normal_balance)
    returning id into account_id;
  end if;

  return account_id;
exception when unique_violation then
  select id into account_id
  from public.ledger_accounts
  where owner_type=target_owner_type
    and owner_id is not distinct from target_owner_id
    and account_code=target_account_code
    and currency=upper(target_currency)
  limit 1;
  return account_id;
end;
$$;

revoke all on function app_private.ensure_ledger_account(text,uuid,text,text,text,text) from public;
grant execute on function app_private.ensure_ledger_account(text,uuid,text,text,text,text) to service_role;

create or replace function app_private.sync_legacy_commerce_order(target_source_kind text,target_source_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  source_order record;
  source_item record;
  canonical_order_id uuid;
  canonical_item_id uuid;
  offer_row public.commerce_offers;
  offer_price_id uuid;
  conversion_row record;
  parameter_snapshot jsonb;
  platform_bps integer;
  affiliate_bps integer := 0;
  order_subtotal bigint := 0;
  order_discount bigint := 0;
  order_tax bigint := 0;
  total_items integer := 0;
  item_index integer := 0;
  remaining_discount bigint := 0;
  item_discount bigint := 0;
  item_net bigint := 0;
  platform_amount bigint := 0;
  affiliate_amount bigint := 0;
  seller_amount bigint := 0;
  payout_delay integer := 0;
  available_at timestamptz;
  transaction_id uuid;
  account_id uuid;
  platform_total bigint := 0;
  affiliate_total bigint := 0;
  seller_total bigint := 0;
  credit_total bigint := 0;
  normalized_status text;
  payment_reference text;
begin
  select * into source_order
  from app_private.legacy_commerce_orders
  where source_kind=target_source_kind and source_id=target_source_id;

  if source_order.source_id is null then return null; end if;

  normalized_status := case
    when source_order.status='paid' then 'paid'
    when source_order.status='refunded' then 'refunded'
    when source_order.status in ('canceled','cancelled') then 'canceled'
    when source_order.status='failed' then 'failed'
    else 'pending'
  end;

  insert into public.commerce_orders(
    buyer_id,status,currency,subtotal_cents,discount_cents,tax_cents,total_cents,
    provider,provider_reference,idempotency_key,source_order_kind,source_order_id,
    checkout_snapshot,is_demo,paid_at,refunded_at,canceled_at,created_at,updated_at
  ) values(
    source_order.buyer_id,normalized_status,source_order.currency,source_order.amount_cents,0,0,source_order.amount_cents,
    source_order.provider,target_source_kind || ':' || coalesce(source_order.provider_reference,source_order.source_id::text),
    'legacy:' || target_source_kind || ':' || source_order.source_id::text,target_source_kind,source_order.source_id,
    jsonb_build_object('source','legacy_sync','legacyProviderReference',source_order.provider_reference),
    source_order.is_demo,source_order.paid_at,
    case when normalized_status='refunded' then coalesce(source_order.updated_at,now()) else null end,
    case when normalized_status='canceled' then coalesce(source_order.updated_at,now()) else null end,
    source_order.created_at,source_order.updated_at
  )
  on conflict(source_order_kind,source_order_id) do update
  set buyer_id=excluded.buyer_id,status=excluded.status,provider=excluded.provider,
      provider_reference=excluded.provider_reference,is_demo=excluded.is_demo,paid_at=excluded.paid_at,
      refunded_at=excluded.refunded_at,canceled_at=excluded.canceled_at,updated_at=excluded.updated_at
  returning id into canonical_order_id;

  select coalesce(sum(amount_cents),0),count(*)
  into order_subtotal,total_items
  from app_private.legacy_commerce_order_items
  where source_kind=target_source_kind and source_order_id=target_source_id;

  order_discount := greatest(order_subtotal-source_order.amount_cents,0);
  order_tax := greatest(source_order.amount_cents-order_subtotal,0);
  remaining_discount := order_discount;

  update public.commerce_orders
  set subtotal_cents=order_subtotal,discount_cents=order_discount,tax_cents=order_tax,total_cents=source_order.amount_cents
  where id=canonical_order_id;

  parameter_snapshot := public.resolve_commercial_parameter('financial.default_platform_commission_bps');
  platform_bps := greatest(0,least(10000,coalesce((parameter_snapshot->>'value')::integer,0)));
  payout_delay := greatest(0,coalesce((public.resolve_commercial_parameter('financial.payout_delay_days')->>'value')::integer,0));
  available_at := coalesce(source_order.paid_at,now()) + make_interval(days=>payout_delay);

  select conversion.id,conversion.affiliate_id,conversion.gross_amount_cents,conversion.commission_amount_cents
  into conversion_row
  from public.affiliate_conversions conversion
  where conversion.order_id=target_source_id
    and conversion.status not in ('rejected','reversed')
  order by conversion.converted_at desc
  limit 1;

  if conversion_row.id is not null and conversion_row.gross_amount_cents>0 then
    affiliate_bps := greatest(0,least(10000,round(conversion_row.commission_amount_cents::numeric*10000/conversion_row.gross_amount_cents)::integer));
  end if;

  for source_item in
    select * from app_private.legacy_commerce_order_items
    where source_kind=target_source_kind and source_order_id=target_source_id
    order by created_at,source_item_id
  loop
    item_index := item_index+1;
    if item_index=total_items then
      item_discount := remaining_discount;
    elsif order_subtotal>0 then
      item_discount := least(remaining_discount,round(order_discount::numeric*source_item.amount_cents/order_subtotal)::bigint);
    else
      item_discount := 0;
    end if;
    remaining_discount := greatest(remaining_discount-item_discount,0);
    item_net := greatest(source_item.amount_cents-item_discount,0);

    select * into offer_row from public.commerce_offers
    where resource_type=source_item.resource_type and resource_id=source_item.resource_id;

    select price.id into offer_price_id
    from public.commerce_offer_prices price
    where price.offer_id=offer_row.id and price.amount_cents=source_item.amount_cents
      and price.effective_from<=source_item.created_at
    order by price.version desc limit 1;

    if source_item.seller_id is null then
      platform_amount := item_net;
      affiliate_amount := 0;
      seller_amount := 0;
    else
      platform_amount := least(item_net,round(item_net::numeric*platform_bps/10000)::bigint);
      affiliate_amount := least(item_net-platform_amount,round(item_net::numeric*affiliate_bps/10000)::bigint);
      seller_amount := item_net-platform_amount-affiliate_amount;
    end if;

    insert into public.commerce_order_items(
      order_id,offer_id,offer_price_id,resource_type,resource_id,seller_id,title_snapshot,
      quantity,unit_amount_cents,gross_amount_cents,discount_cents,
      platform_commission_bps,platform_commission_cents,affiliate_id,affiliate_commission_bps,
      affiliate_commission_cents,seller_net_cents,commercial_snapshot,source_item_kind,source_item_id,created_at
    ) values(
      canonical_order_id,offer_row.id,offer_price_id,source_item.resource_type,source_item.resource_id,source_item.seller_id,source_item.title_snapshot,
      1,source_item.amount_cents,source_item.amount_cents,item_discount,
      case when source_item.seller_id is null then 10000 else platform_bps end,platform_amount,
      conversion_row.affiliate_id,case when conversion_row.id is null then 0 else affiliate_bps end,
      affiliate_amount,seller_amount,
      jsonb_build_object('source','legacy_sync','platformParameter',parameter_snapshot,'affiliateConversionId',conversion_row.id,'legacyAmountCents',source_item.amount_cents),
      target_source_kind,source_item.source_item_id,source_item.created_at
    )
    on conflict(source_item_kind,source_item_id) do nothing
    returning id into canonical_item_id;

    if canonical_item_id is null then
      select id into canonical_item_id from public.commerce_order_items
      where source_item_kind=target_source_kind and source_item_id=source_item.source_item_id;
    end if;

    insert into public.revenue_splits(order_item_id,beneficiary_type,beneficiary_id,amount_cents,percentage_bps,status,available_at,metadata)
    values(canonical_item_id,'platform',null,platform_amount,case when item_net=0 then 0 else round(platform_amount::numeric*10000/item_net)::integer end,
      case when normalized_status='paid' and available_at<=now() then 'available' else 'pending' end,available_at,jsonb_build_object('source','legacy_sync'))
    on conflict do nothing;

    if source_item.seller_id is not null and seller_amount>0 then
      insert into public.revenue_splits(order_item_id,beneficiary_type,beneficiary_id,amount_cents,percentage_bps,status,available_at,metadata)
      values(canonical_item_id,'seller',source_item.seller_id,seller_amount,case when item_net=0 then 0 else round(seller_amount::numeric*10000/item_net)::integer end,
        case when normalized_status='paid' and available_at<=now() then 'available' else 'pending' end,available_at,jsonb_build_object('source','legacy_sync'))
      on conflict do nothing;
    end if;

    if conversion_row.affiliate_id is not null and affiliate_amount>0 then
      insert into public.revenue_splits(order_item_id,beneficiary_type,beneficiary_id,amount_cents,percentage_bps,status,available_at,metadata)
      values(canonical_item_id,'affiliate',conversion_row.affiliate_id,affiliate_amount,case when item_net=0 then 0 else round(affiliate_amount::numeric*10000/item_net)::integer end,
        case when normalized_status='paid' and available_at<=now() then 'available' else 'pending' end,available_at,jsonb_build_object('source','legacy_sync','conversionId',conversion_row.id))
      on conflict do nothing;
    end if;
  end loop;

  if normalized_status='paid' and total_items>0 and order_subtotal>=source_order.amount_cents then
    payment_reference := 'legacy:' || target_source_kind || ':' || source_order.source_id::text;

    insert into public.payment_attempts(order_id,provider,provider_reference,payment_method,amount_cents,currency,status,provider_payload,idempotency_key,created_at,updated_at)
    values(canonical_order_id,source_order.provider,payment_reference,'legacy',source_order.amount_cents,source_order.currency,'paid',
      jsonb_build_object('source','legacy_sync','originalProviderReference',source_order.provider_reference),payment_reference,source_order.created_at,source_order.updated_at)
    on conflict(idempotency_key) do nothing;

    insert into public.payments(order_id,attempt_id,provider,provider_reference,payment_method,gross_amount_cents,provider_fee_cents,net_received_cents,currency,status,paid_at,metadata,created_at,updated_at)
    select canonical_order_id,attempt.id,source_order.provider,payment_reference,'legacy',source_order.amount_cents,0,source_order.amount_cents,source_order.currency,'paid',
      coalesce(source_order.paid_at,source_order.created_at),jsonb_build_object('source','legacy_sync'),source_order.created_at,source_order.updated_at
    from public.payment_attempts attempt where attempt.idempotency_key=payment_reference
    on conflict(provider,provider_reference) do nothing;

    insert into public.commerce_entitlements(user_id,order_id,order_item_id,resource_type,resource_id,status,granted_at,starts_at,expires_at,metadata,is_demo)
    select source_order.buyer_id,canonical_order_id,item.id,item.resource_type,item.resource_id,'active',coalesce(source_order.paid_at,source_order.created_at),
      coalesce(source_order.paid_at,source_order.created_at),
      case when offer.access_duration_days is null then null else coalesce(source_order.paid_at,source_order.created_at)+make_interval(days=>offer.access_duration_days) end,
      jsonb_build_object('source','legacy_sync'),source_order.is_demo
    from public.commerce_order_items item
    left join public.commerce_offers offer on offer.id=item.offer_id
    where item.order_id=canonical_order_id and source_order.buyer_id is not null
    on conflict(user_id,order_item_id,resource_type,resource_id) do update
    set status='active',revoked_at=null,revoke_reason=null,updated_at=now();

    insert into public.commerce_order_events(order_id,event_type,from_status,to_status,metadata,created_at)
    select canonical_order_id,'payment_confirmed','pending','paid',jsonb_build_object('source','legacy_sync'),coalesce(source_order.paid_at,source_order.created_at)
    where not exists(select 1 from public.commerce_order_events event where event.order_id=canonical_order_id and event.event_type='payment_confirmed');

    insert into public.ledger_transactions(event_type,reference_type,reference_id,description,currency,metadata,is_demo,occurred_at)
    values('payment_captured','commerce_order',canonical_order_id,'Pagamento confirmado',source_order.currency,jsonb_build_object('source','legacy_sync'),source_order.is_demo,coalesce(source_order.paid_at,source_order.created_at))
    on conflict(event_type,reference_type,reference_id) do nothing
    returning id into transaction_id;

    if transaction_id is not null and source_order.amount_cents>0 then
      select coalesce(sum(platform_commission_cents),0),coalesce(sum(affiliate_commission_cents),0),coalesce(sum(seller_net_cents),0)
      into platform_total,affiliate_total,seller_total
      from public.commerce_order_items where order_id=canonical_order_id;
      credit_total := platform_total+affiliate_total+seller_total+order_tax;
      if credit_total<>source_order.amount_cents then
        raise exception 'Lançamento canônico desbalanceado para pedido %: débito %, crédito %',canonical_order_id,source_order.amount_cents,credit_total;
      end if;

      account_id := app_private.ensure_ledger_account('platform',null,'cash.received','Caixa recebido',source_order.currency,'debit');
      insert into public.ledger_postings(transaction_id,account_id,direction,amount_cents,memo)
      values(transaction_id,account_id,'debit',source_order.amount_cents,'Valor bruto recebido');

      if platform_total>0 then
        account_id := app_private.ensure_ledger_account('platform',null,'revenue.platform','Receita da plataforma',source_order.currency,'credit');
        insert into public.ledger_postings(transaction_id,account_id,direction,amount_cents,memo)
        values(transaction_id,account_id,'credit',platform_total,'Comissão da plataforma');
      end if;

      for source_item in
        select seller_id,sum(seller_net_cents)::bigint as amount
        from public.commerce_order_items where order_id=canonical_order_id and seller_id is not null
        group by seller_id having sum(seller_net_cents)>0
      loop
        account_id := app_private.ensure_ledger_account('user',source_item.seller_id,'payable.earnings','Valores a repassar',source_order.currency,'credit');
        insert into public.ledger_postings(transaction_id,account_id,direction,amount_cents,memo)
        values(transaction_id,account_id,'credit',source_item.amount,'Valor líquido do vendedor');
      end loop;

      for source_item in
        select affiliate_id,sum(affiliate_commission_cents)::bigint as amount
        from public.commerce_order_items where order_id=canonical_order_id and affiliate_id is not null
        group by affiliate_id having sum(affiliate_commission_cents)>0
      loop
        account_id := app_private.ensure_ledger_account('affiliate',source_item.affiliate_id,'payable.affiliate','Comissões de afiliado',source_order.currency,'credit');
        insert into public.ledger_postings(transaction_id,account_id,direction,amount_cents,memo)
        values(transaction_id,account_id,'credit',source_item.amount,'Comissão de afiliado');
      end loop;

      if order_tax>0 then
        account_id := app_private.ensure_ledger_account('tax_authority',null,'payable.tax','Tributos a recolher',source_order.currency,'credit');
        insert into public.ledger_postings(transaction_id,account_id,direction,amount_cents,memo)
        values(transaction_id,account_id,'credit',order_tax,'Tributos do pedido');
      end if;
    end if;
  end if;

  return canonical_order_id;
end;
$$;

revoke all on function app_private.sync_legacy_commerce_order(text,uuid) from public;
grant execute on function app_private.sync_legacy_commerce_order(text,uuid) to service_role;

create or replace function app_private.sync_legacy_commerce_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_kind text;
  target_id uuid;
begin
  target_kind := case
    when tg_table_name in ('course_orders','course_order_items') then 'course'
    when tg_table_name in ('digital_product_orders','digital_product_order_items') then 'digital_product'
    when tg_table_name in ('beat_orders','beat_order_items') then 'beat'
  end;
  target_id := case when tg_table_name in ('course_orders','digital_product_orders','beat_orders') then new.id else new.order_id end;
  perform app_private.sync_legacy_commerce_order(target_kind,target_id);
  return new;
end;
$$;

create or replace function app_private.sync_affiliate_conversion_commerce_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.order_id is not null then
    if exists(select 1 from public.course_orders where id=new.order_id) then
      perform app_private.sync_legacy_commerce_order('course',new.order_id);
    elsif exists(select 1 from public.digital_product_orders where id=new.order_id) then
      perform app_private.sync_legacy_commerce_order('digital_product',new.order_id);
    elsif exists(select 1 from public.beat_orders where id=new.order_id) then
      perform app_private.sync_legacy_commerce_order('beat',new.order_id);
    end if;
  end if;
  return new;
end;
$$;

revoke all on function app_private.sync_legacy_commerce_trigger() from public;
revoke all on function app_private.sync_affiliate_conversion_commerce_trigger() from public;

drop trigger if exists sync_course_orders_canonical on public.course_orders;
create trigger sync_course_orders_canonical after insert or update of status,provider,provider_reference,amount_cents,currency,paid_at on public.course_orders
for each row execute function app_private.sync_legacy_commerce_trigger();
drop trigger if exists sync_course_order_items_canonical on public.course_order_items;
create trigger sync_course_order_items_canonical after insert or update of amount_cents,currency,paid_at on public.course_order_items
for each row execute function app_private.sync_legacy_commerce_trigger();

drop trigger if exists sync_product_orders_canonical on public.digital_product_orders;
create trigger sync_product_orders_canonical after insert or update of status,provider,provider_reference,amount_cents,currency,paid_at on public.digital_product_orders
for each row execute function app_private.sync_legacy_commerce_trigger();
drop trigger if exists sync_product_order_items_canonical on public.digital_product_order_items;
create trigger sync_product_order_items_canonical after insert or update of amount_cents,currency,paid_at,status on public.digital_product_order_items
for each row execute function app_private.sync_legacy_commerce_trigger();

drop trigger if exists sync_beat_orders_canonical on public.beat_orders;
create trigger sync_beat_orders_canonical after insert or update of status,provider,provider_reference,amount_cents,currency,paid_at on public.beat_orders
for each row execute function app_private.sync_legacy_commerce_trigger();
drop trigger if exists sync_beat_order_items_canonical on public.beat_order_items;
create trigger sync_beat_order_items_canonical after insert or update of amount_cents,currency,paid_at,status on public.beat_order_items
for each row execute function app_private.sync_legacy_commerce_trigger();

drop trigger if exists sync_affiliate_conversion_canonical on public.affiliate_conversions;
create trigger sync_affiliate_conversion_canonical after insert or update of commission_amount_cents,status,order_id on public.affiliate_conversions
for each row execute function app_private.sync_affiliate_conversion_commerce_trigger();

do $$ declare source record; begin
  for source in select source_kind,source_id from app_private.legacy_commerce_orders order by created_at loop
    perform app_private.sync_legacy_commerce_order(source.source_kind,source.source_id);
  end loop;
end $$;

create or replace view public.ledger_account_balances
with (security_invoker=true)
as
select account.id as account_id,account.owner_type,account.owner_id,account.account_code,account.name,account.currency,account.normal_balance,
  coalesce(sum(case when posting.direction=account.normal_balance then posting.amount_cents else -posting.amount_cents end),0)::bigint as balance_cents
from public.ledger_accounts account
left join public.ledger_postings posting on posting.account_id=account.id
group by account.id;

grant select on public.ledger_account_balances to authenticated;

commit;
