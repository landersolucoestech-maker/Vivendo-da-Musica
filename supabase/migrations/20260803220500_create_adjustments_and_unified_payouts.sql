begin;

create table if not exists public.payment_adjustments (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete restrict,
  order_id uuid not null references public.commerce_orders(id) on delete restrict,
  adjustment_type text not null,
  amount_cents bigint not null,
  currency text not null,
  provider_reference text,
  idempotency_key text not null unique,
  reason text,
  status text not null default 'confirmed',
  metadata jsonb not null default '{}'::jsonb,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint payment_adjustments_type_check check (adjustment_type in ('refund','chargeback')),
  constraint payment_adjustments_amount_check check (amount_cents > 0),
  constraint payment_adjustments_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint payment_adjustments_status_check check (status in ('pending','confirmed','failed','canceled')),
  unique (payment_id, provider_reference)
);

create table if not exists public.revenue_split_adjustments (
  id uuid primary key default gen_random_uuid(),
  adjustment_id uuid not null references public.payment_adjustments(id) on delete cascade,
  revenue_split_id uuid not null references public.revenue_splits(id) on delete restrict,
  amount_cents bigint not null,
  created_at timestamptz not null default now(),
  constraint revenue_split_adjustments_amount_check check (amount_cents > 0),
  unique (adjustment_id,revenue_split_id)
);

alter table public.payout_requests
  add column if not exists beneficiary_type text not null default 'seller',
  add column if not exists beneficiary_id uuid,
  add column if not exists source_request_kind text,
  add column if not exists source_request_id uuid;

alter table public.payout_requests drop constraint if exists payout_requests_beneficiary_type_check;
alter table public.payout_requests add constraint payout_requests_beneficiary_type_check
check (beneficiary_type in ('seller','affiliate'));

create unique index if not exists payout_requests_source_request_idx
on public.payout_requests(source_request_kind,source_request_id)
where source_request_id is not null;

create table if not exists public.payout_allocations (
  id uuid primary key default gen_random_uuid(),
  payout_request_id uuid not null references public.payout_requests(id) on delete cascade,
  revenue_split_id uuid not null references public.revenue_splits(id) on delete restrict,
  amount_cents bigint not null,
  created_at timestamptz not null default now(),
  constraint payout_allocations_amount_check check (amount_cents > 0),
  unique(payout_request_id,revenue_split_id)
);

create index if not exists payment_adjustments_order_created_idx on public.payment_adjustments(order_id,created_at desc);
create index if not exists revenue_split_adjustments_split_idx on public.revenue_split_adjustments(revenue_split_id);
create index if not exists payout_allocations_split_idx on public.payout_allocations(revenue_split_id);

alter table public.payment_adjustments enable row level security;
alter table public.revenue_split_adjustments enable row level security;
alter table public.payout_allocations enable row level security;

create policy payment_adjustments_owner_read on public.payment_adjustments
for select to authenticated using (public.can_read_commerce_order(order_id));
create policy payment_adjustments_demo_read on public.payment_adjustments
for select to anon using (exists(select 1 from public.commerce_orders orders where orders.id=order_id and orders.is_demo));
create policy payment_adjustments_staff_manage on public.payment_adjustments
for all to authenticated using(public.is_platform_staff()) with check(public.is_platform_staff());

create policy revenue_split_adjustments_beneficiary_read on public.revenue_split_adjustments
for select to authenticated using(
  exists(select 1 from public.revenue_splits split where split.id=revenue_split_id and (
    public.is_platform_staff()
    or (split.beneficiary_type in ('seller','coproducer') and split.beneficiary_id=(select auth.uid()))
    or (split.beneficiary_type='affiliate' and public.is_affiliate_owner(split.beneficiary_id))
  ))
);
create policy revenue_split_adjustments_demo_read on public.revenue_split_adjustments
for select to anon using(exists(select 1 from public.payment_adjustments adjustment where adjustment.id=adjustment_id and exists(select 1 from public.commerce_orders orders where orders.id=adjustment.order_id and orders.is_demo)));
create policy revenue_split_adjustments_staff_manage on public.revenue_split_adjustments
for all to authenticated using(public.is_platform_staff()) with check(public.is_platform_staff());

create policy payout_allocations_owner_read on public.payout_allocations
for select to authenticated using(exists(select 1 from public.payout_requests request where request.id=payout_request_id and (request.owner_user_id=(select auth.uid()) or public.is_platform_staff())));
create policy payout_allocations_staff_manage on public.payout_allocations
for all to authenticated using(public.is_platform_staff()) with check(public.is_platform_staff());

grant select on public.payment_adjustments,public.revenue_split_adjustments to anon,authenticated;
grant select on public.payout_allocations to authenticated;
grant insert,update,delete on public.payment_adjustments,public.revenue_split_adjustments,public.payout_allocations to authenticated;
grant all on public.payment_adjustments,public.revenue_split_adjustments,public.payout_allocations to service_role;

create or replace view public.beneficiary_balances
with(security_invoker=true)
as
select split.beneficiary_type,split.beneficiary_id,
  split.order_item_id,
  split.id as revenue_split_id,
  split.amount_cents,
  split.status,
  split.available_at,
  greatest(split.amount_cents
    -coalesce((select sum(adjustment.amount_cents) from public.revenue_split_adjustments adjustment where adjustment.revenue_split_id=split.id),0)
    -coalesce((select sum(allocation.amount_cents) from public.payout_allocations allocation join public.payout_requests request on request.id=allocation.payout_request_id where allocation.revenue_split_id=split.id and request.status in ('requested','processing','paid')),0),0)::bigint as unallocated_cents
from public.revenue_splits split
where split.beneficiary_type in ('seller','affiliate');

grant select on public.beneficiary_balances to authenticated;

create or replace function app_private.record_payment_adjustment(
  target_order_id uuid,
  target_adjustment_type text,
  target_amount_cents bigint,
  target_provider_reference text,
  target_idempotency_key text,
  target_reason text,
  target_metadata jsonb default '{}'::jsonb
)
returns public.payment_adjustments
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  target_order public.commerce_orders;
  target_payment public.payments;
  result public.payment_adjustments;
  remaining bigint;
  split_row record;
  posting_row record;
  split_total bigint;
  posting_total bigint;
  allocated bigint:=0;
  allocation bigint;
  index_no integer:=0;
  row_count_total integer;
  transaction_id uuid;
  cash_account_id uuid;
  new_refunded bigint;
  new_chargeback bigint;
begin
  if target_adjustment_type not in ('refund','chargeback') then raise exception 'Tipo de ajuste inválido.'; end if;
  if target_amount_cents<=0 then raise exception 'Valor inválido.'; end if;

  select * into target_order from public.commerce_orders where id=target_order_id for update;
  if target_order.id is null or target_order.status not in ('paid','partially_refunded','chargeback') then raise exception 'Pedido não permite ajuste.'; end if;
  select * into target_payment from public.payments where order_id=target_order_id order by paid_at desc limit 1 for update;
  if target_payment.id is null then raise exception 'Pagamento não encontrado.'; end if;

  remaining:=target_payment.gross_amount_cents-target_payment.refunded_amount_cents-target_payment.chargeback_amount_cents;
  if target_amount_cents>remaining then raise exception 'Valor superior ao saldo ajustável.'; end if;

  insert into public.payment_adjustments(payment_id,order_id,adjustment_type,amount_cents,currency,provider_reference,idempotency_key,reason,status,metadata,confirmed_at)
  values(target_payment.id,target_order_id,target_adjustment_type,target_amount_cents,target_payment.currency,nullif(trim(coalesce(target_provider_reference,'')),''),target_idempotency_key,nullif(trim(coalesce(target_reason,'')),''),'confirmed',coalesce(target_metadata,'{}'::jsonb),now())
  on conflict(idempotency_key) do update set idempotency_key=excluded.idempotency_key
  returning * into result;

  if exists(select 1 from public.ledger_transactions where event_type='payment_'||target_adjustment_type and reference_type='payment_adjustment' and reference_id=result.id) then return result; end if;

  select coalesce(sum(greatest(split.amount_cents-coalesce((select sum(existing.amount_cents) from public.revenue_split_adjustments existing where existing.revenue_split_id=split.id),0),0)),0),count(*)
  into split_total,row_count_total
  from public.revenue_splits split join public.commerce_order_items item on item.id=split.order_item_id
  where item.order_id=target_order_id;

  allocated:=0; index_no:=0;
  for split_row in
    select split.id,greatest(split.amount_cents-coalesce((select sum(existing.amount_cents) from public.revenue_split_adjustments existing where existing.revenue_split_id=split.id),0),0)::bigint as available
    from public.revenue_splits split join public.commerce_order_items item on item.id=split.order_item_id
    where item.order_id=target_order_id
    order by split.created_at,split.id
  loop
    if split_row.available<=0 then continue; end if;
    index_no:=index_no+1;
    if index_no=row_count_total or allocated>=target_amount_cents then allocation:=target_amount_cents-allocated;
    else allocation:=least(split_row.available,round(target_amount_cents::numeric*split_row.available/greatest(target_payment.gross_amount_cents,1))::bigint); end if;
    allocation:=least(allocation,split_row.available,target_amount_cents-allocated);
    if allocation>0 then
      insert into public.revenue_split_adjustments(adjustment_id,revenue_split_id,amount_cents) values(result.id,split_row.id,allocation) on conflict do nothing;
      allocated:=allocated+allocation;
    end if;
    exit when allocated=least(target_amount_cents,split_total);
  end loop;

  new_refunded:=target_payment.refunded_amount_cents+case when target_adjustment_type='refund' then target_amount_cents else 0 end;
  new_chargeback:=target_payment.chargeback_amount_cents+case when target_adjustment_type='chargeback' then target_amount_cents else 0 end;
  update public.payments set refunded_amount_cents=new_refunded,chargeback_amount_cents=new_chargeback,
    status=case when new_chargeback>0 then 'chargeback' when new_refunded=target_payment.gross_amount_cents then 'refunded' else 'partially_refunded' end
  where id=target_payment.id;

  update public.commerce_orders set
    status=case when new_chargeback>0 then 'chargeback' when new_refunded=target_payment.gross_amount_cents then 'refunded' else 'partially_refunded' end,
    refunded_at=case when new_refunded=target_payment.gross_amount_cents then now() else refunded_at end
  where id=target_order_id;

  if new_refunded+new_chargeback=target_payment.gross_amount_cents then
    update public.commerce_entitlements set status=case when target_adjustment_type='refund' then 'refunded' else 'revoked' end,revoked_at=now(),revoke_reason=coalesce(target_reason,target_adjustment_type)
    where order_id=target_order_id and status='active';
    update public.revenue_splits split set status='reversed'
    where exists(select 1 from public.commerce_order_items item where item.id=split.order_item_id and item.order_id=target_order_id);
  end if;

  insert into public.ledger_transactions(event_type,reference_type,reference_id,description,currency,metadata,is_demo,occurred_at)
  values('payment_'||target_adjustment_type,'payment_adjustment',result.id,case when target_adjustment_type='refund' then 'Reembolso confirmado' else 'Chargeback confirmado' end,target_payment.currency,jsonb_build_object('orderId',target_order_id),target_order.is_demo,now())
  returning id into transaction_id;

  select coalesce(sum(posting.amount_cents),0),count(*) into posting_total,row_count_total
  from public.ledger_postings posting join public.ledger_transactions transaction on transaction.id=posting.transaction_id
  where transaction.event_type='payment_captured' and transaction.reference_type='commerce_order' and transaction.reference_id=target_order_id and posting.direction='credit';

  allocated:=0; index_no:=0;
  for posting_row in
    select posting.account_id,posting.amount_cents
    from public.ledger_postings posting join public.ledger_transactions transaction on transaction.id=posting.transaction_id
    where transaction.event_type='payment_captured' and transaction.reference_type='commerce_order' and transaction.reference_id=target_order_id and posting.direction='credit'
    order by posting.created_at,posting.id
  loop
    index_no:=index_no+1;
    if index_no=row_count_total then allocation:=target_amount_cents-allocated;
    else allocation:=round(target_amount_cents::numeric*posting_row.amount_cents/greatest(posting_total,1))::bigint; end if;
    allocation:=least(allocation,target_amount_cents-allocated);
    if allocation>0 then
      insert into public.ledger_postings(transaction_id,account_id,direction,amount_cents,memo)
      values(transaction_id,posting_row.account_id,'debit',allocation,'Reversão proporcional');
      allocated:=allocated+allocation;
    end if;
  end loop;

  cash_account_id:=app_private.ensure_ledger_account('platform',null,'cash.received','Caixa recebido',target_payment.currency,'debit');
  insert into public.ledger_postings(transaction_id,account_id,direction,amount_cents,memo)
  values(transaction_id,cash_account_id,'credit',target_amount_cents,'Saída financeira do ajuste');

  insert into public.commerce_order_events(order_id,event_type,from_status,to_status,actor_id,metadata)
  values(target_order_id,target_adjustment_type,target_order.status,(select status from public.commerce_orders where id=target_order_id),(select auth.uid()),jsonb_build_object('adjustmentId',result.id,'amountCents',target_amount_cents));

  return result;
end;
$$;

revoke all on function app_private.record_payment_adjustment(uuid,text,bigint,text,text,text,jsonb) from public;
grant execute on function app_private.record_payment_adjustment(uuid,text,bigint,text,text,text,jsonb) to authenticated,service_role;

create or replace function public.admin_record_payment_adjustment(target_order_id uuid,target_adjustment_type text,target_amount_cents bigint,target_provider_reference text,target_idempotency_key text,target_reason text)
returns public.payment_adjustments
language plpgsql
security invoker
set search_path=public,app_private,pg_temp
as $$
begin
  if not public.is_platform_staff() then raise exception 'Acesso administrativo obrigatório.'; end if;
  return app_private.record_payment_adjustment(target_order_id,target_adjustment_type,target_amount_cents,target_provider_reference,target_idempotency_key,target_reason,jsonb_build_object('source','admin'));
end;
$$;

create or replace function public.admin_record_demo_payment_adjustment(target_order_id uuid,target_adjustment_type text,target_amount_cents bigint,target_idempotency_key text,target_reason text)
returns public.payment_adjustments
language plpgsql
security invoker
set search_path=public,app_private,pg_temp
as $$
begin
  if not exists(select 1 from public.commerce_orders where id=target_order_id and is_demo) then raise exception 'Pedido demonstrativo não encontrado.'; end if;
  return app_private.record_payment_adjustment(target_order_id,target_adjustment_type,target_amount_cents,null,target_idempotency_key,target_reason,jsonb_build_object('source','demo_admin'));
end;
$$;

revoke all on function public.admin_record_payment_adjustment(uuid,text,bigint,text,text,text) from public,anon;
grant execute on function public.admin_record_payment_adjustment(uuid,text,bigint,text,text,text) to authenticated,service_role;
revoke all on function public.admin_record_demo_payment_adjustment(uuid,text,bigint,text,text) from public;
grant execute on function public.admin_record_demo_payment_adjustment(uuid,text,bigint,text,text) to anon,authenticated,service_role;

create or replace function app_private.request_unified_payout(target_owner_user_id uuid,target_destination_id uuid,target_beneficiary_type text,target_amount_cents bigint,target_currency text,target_is_demo boolean)
returns public.payout_requests
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  destination public.payout_destinations;
  beneficiary uuid;
  result public.payout_requests;
  minimum bigint;
  available bigint;
  remaining bigint;
  split_row record;
begin
  if target_beneficiary_type not in ('seller','affiliate') then raise exception 'Origem de saldo inválida.'; end if;
  select * into destination from public.payout_destinations where id=target_destination_id and owner_user_id=target_owner_user_id and verified and status='active';
  if destination.id is null then raise exception 'Destino de repasse inválido.'; end if;

  if target_beneficiary_type='seller' then beneficiary:=target_owner_user_id;
  else select id into beneficiary from public.affiliate_profiles where user_id=target_owner_user_id and status='active' limit 1; end if;
  if beneficiary is null then raise exception 'Beneficiário não encontrado.'; end if;

  minimum:=greatest(0,coalesce((public.resolve_commercial_parameter('financial.payout_minimum_cents')->>'value')::bigint,0));
  if target_amount_cents<minimum then raise exception 'Valor inferior ao mínimo configurado.'; end if;

  select coalesce(sum(unallocated_cents),0) into available from public.beneficiary_balances
  where beneficiary_type=target_beneficiary_type and beneficiary_id=beneficiary and status='available' and available_at<=now();
  if target_amount_cents>available then raise exception 'Saldo disponível insuficiente.'; end if;

  insert into public.payout_requests(owner_user_id,destination_id,amount_cents,currency,status,beneficiary_type,beneficiary_id,is_demo)
  values(target_owner_user_id,target_destination_id,target_amount_cents,upper(target_currency),'requested',target_beneficiary_type,beneficiary,target_is_demo)
  returning * into result;

  remaining:=target_amount_cents;
  for split_row in
    select revenue_split_id,unallocated_cents from public.beneficiary_balances
    where beneficiary_type=target_beneficiary_type and beneficiary_id=beneficiary and status='available' and available_at<=now() and unallocated_cents>0
    order by available_at,revenue_split_id
  loop
    insert into public.payout_allocations(payout_request_id,revenue_split_id,amount_cents)
    values(result.id,split_row.revenue_split_id,least(remaining,split_row.unallocated_cents));
    remaining:=remaining-least(remaining,split_row.unallocated_cents);
    exit when remaining=0;
  end loop;
  if remaining<>0 then raise exception 'Não foi possível alocar todo o repasse.'; end if;
  return result;
end;
$$;

revoke all on function app_private.request_unified_payout(uuid,uuid,text,bigint,text,boolean) from public;
grant execute on function app_private.request_unified_payout(uuid,uuid,text,bigint,text,boolean) to authenticated,service_role;

create or replace function public.request_unified_payout(target_destination_id uuid,target_beneficiary_type text,target_amount_cents bigint,target_currency text default 'BRL')
returns public.payout_requests
language plpgsql
security invoker
set search_path=public,app_private,pg_temp
as $$
begin
  if (select auth.uid()) is null then raise exception 'Autenticação obrigatória.'; end if;
  return app_private.request_unified_payout((select auth.uid()),target_destination_id,target_beneficiary_type,target_amount_cents,target_currency,false);
end;
$$;

revoke all on function public.request_unified_payout(uuid,text,bigint,text) from public,anon;
grant execute on function public.request_unified_payout(uuid,text,bigint,text) to authenticated,service_role;

create or replace function app_private.transition_unified_payout(target_request_id uuid,target_status text,target_provider_reference text,target_failure_reason text)
returns public.payout_requests
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  request public.payout_requests;
  transaction_id uuid;
  payable_account uuid;
  cash_account uuid;
begin
  select * into request from public.payout_requests where id=target_request_id for update;
  if request.id is null then raise exception 'Repasse não encontrado.'; end if;
  if request.status not in ('requested','processing') then raise exception 'Repasse já finalizado.'; end if;
  if target_status not in ('processing','paid','failed','rejected','canceled') then raise exception 'Status inválido.'; end if;

  update public.payout_requests set status=target_status,processed_at=case when target_status in ('paid','failed','rejected','canceled') then now() else null end,
    provider_reference=coalesce(nullif(trim(coalesce(target_provider_reference,'')),''),provider_reference),failure_reason=nullif(trim(coalesce(target_failure_reason,'')),'')
  where id=target_request_id returning * into request;

  if target_status in ('failed','rejected','canceled') then delete from public.payout_allocations where payout_request_id=target_request_id; end if;

  if target_status='paid' then
    update public.revenue_splits split set status=case when coalesce((select sum(allocation.amount_cents) from public.payout_allocations allocation join public.payout_requests paid_request on paid_request.id=allocation.payout_request_id where allocation.revenue_split_id=split.id and paid_request.status='paid'),0)>=split.amount_cents-coalesce((select sum(adjustment.amount_cents) from public.revenue_split_adjustments adjustment where adjustment.revenue_split_id=split.id),0) then 'paid' else split.status end,
      settled_at=case when coalesce((select sum(allocation.amount_cents) from public.payout_allocations allocation join public.payout_requests paid_request on paid_request.id=allocation.payout_request_id where allocation.revenue_split_id=split.id and paid_request.status='paid'),0)>=split.amount_cents-coalesce((select sum(adjustment.amount_cents) from public.revenue_split_adjustments adjustment where adjustment.revenue_split_id=split.id),0) then now() else split.settled_at end
    where exists(select 1 from public.payout_allocations allocation where allocation.payout_request_id=target_request_id and allocation.revenue_split_id=split.id);

    insert into public.ledger_transactions(event_type,reference_type,reference_id,description,currency,metadata,is_demo,occurred_at)
    values('payout_paid','payout_request',request.id,'Repasse pago',request.currency,jsonb_build_object('beneficiaryType',request.beneficiary_type,'beneficiaryId',request.beneficiary_id),request.is_demo,now())
    on conflict(event_type,reference_type,reference_id) do nothing returning id into transaction_id;

    if transaction_id is not null then
      if request.beneficiary_type='seller' then payable_account:=app_private.ensure_ledger_account('user',request.beneficiary_id,'payable.earnings','Valores a repassar',request.currency,'credit');
      else payable_account:=app_private.ensure_ledger_account('affiliate',request.beneficiary_id,'payable.affiliate','Comissões de afiliado',request.currency,'credit'); end if;
      cash_account:=app_private.ensure_ledger_account('platform',null,'cash.received','Caixa recebido',request.currency,'debit');
      insert into public.ledger_postings(transaction_id,account_id,direction,amount_cents,memo) values(transaction_id,payable_account,'debit',request.amount_cents,'Baixa da obrigação');
      insert into public.ledger_postings(transaction_id,account_id,direction,amount_cents,memo) values(transaction_id,cash_account,'credit',request.amount_cents,'Saída do repasse');
    end if;
  end if;
  return request;
end;
$$;

revoke all on function app_private.transition_unified_payout(uuid,text,text,text) from public;
grant execute on function app_private.transition_unified_payout(uuid,text,text,text) to authenticated,service_role;

create or replace function public.admin_transition_unified_payout(target_request_id uuid,target_status text,target_provider_reference text default null,target_failure_reason text default null)
returns public.payout_requests
language plpgsql
security invoker
set search_path=public,app_private,pg_temp
as $$
begin
  if not public.is_platform_staff() then raise exception 'Acesso administrativo obrigatório.'; end if;
  return app_private.transition_unified_payout(target_request_id,target_status,target_provider_reference,target_failure_reason);
end;
$$;

create or replace function public.admin_transition_demo_unified_payout(target_request_id uuid,target_status text,target_provider_reference text default null,target_failure_reason text default null)
returns public.payout_requests
language plpgsql
security invoker
set search_path=public,app_private,pg_temp
as $$
begin
  if not exists(select 1 from public.payout_requests where id=target_request_id and is_demo) then raise exception 'Repasse demonstrativo não encontrado.'; end if;
  return app_private.transition_unified_payout(target_request_id,target_status,target_provider_reference,target_failure_reason);
end;
$$;

revoke all on function public.admin_transition_unified_payout(uuid,text,text,text) from public,anon;
grant execute on function public.admin_transition_unified_payout(uuid,text,text,text) to authenticated,service_role;
revoke all on function public.admin_transition_demo_unified_payout(uuid,text,text,text) from public;
grant execute on function public.admin_transition_demo_unified_payout(uuid,text,text,text) to anon,authenticated,service_role;

insert into public.payout_destinations(id,owner_user_id,destination_type,display_label,verified,is_default,status)
select method.id,method.producer_id,case when method.method_type='pix' then 'pix' else 'bank_account' end,method.display_label,method.verified,method.is_default,'active'
from public.producer_payout_methods method
on conflict(id) do nothing;

insert into public.payout_requests(id,owner_user_id,destination_id,amount_cents,currency,status,requested_at,processed_at,beneficiary_type,beneficiary_id,source_request_kind,source_request_id,is_demo)
select request.id,request.producer_id,request.payout_method_id,request.amount_cents,request.currency,
  case when request.status in ('requested','processing','paid','failed','canceled') then request.status else 'failed' end,
  request.requested_at,request.processed_at,'seller',request.producer_id,'producer',request.id,
  exists(select 1 from public.user_profiles profile where profile.user_id=request.producer_id and profile.is_demo)
from public.producer_payout_requests request
on conflict(id) do nothing;

insert into public.payout_destinations(owner_user_id,destination_type,display_label,verified,is_default,status)
select affiliate.user_id,case when min(withdrawal.payment_method)='pix' then 'pix' else 'bank_account' end,'Destino de afiliado',true,true,'active'
from public.affiliate_profiles affiliate join public.affiliate_withdrawals withdrawal on withdrawal.affiliate_id=affiliate.id
where affiliate.user_id is not null and not exists(select 1 from public.payout_destinations destination where destination.owner_user_id=affiliate.user_id)
group by affiliate.user_id;

insert into public.payout_requests(id,owner_user_id,destination_id,amount_cents,currency,status,requested_at,processed_at,provider_reference,beneficiary_type,beneficiary_id,source_request_kind,source_request_id,is_demo)
select withdrawal.id,affiliate.user_id,destination.id,withdrawal.amount_cents,'BRL',
  case when withdrawal.status in ('requested','processing','paid','rejected','canceled') then withdrawal.status else 'failed' end,
  withdrawal.requested_at,withdrawal.processed_at,withdrawal.payment_reference,'affiliate',affiliate.id,'affiliate',withdrawal.id,affiliate.is_demo
from public.affiliate_withdrawals withdrawal join public.affiliate_profiles affiliate on affiliate.id=withdrawal.affiliate_id
join lateral(select id from public.payout_destinations where owner_user_id=affiliate.user_id order by is_default desc,created_at limit 1) destination on true
where affiliate.user_id is not null
on conflict(id) do nothing;

commit;
