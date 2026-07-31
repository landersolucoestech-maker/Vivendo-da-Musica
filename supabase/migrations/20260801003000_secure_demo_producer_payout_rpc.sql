create or replace function public.request_demo_producer_payout(
  target_method_id uuid,
  requested_amount_cents bigint,
  requested_currency text
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  account_row public.producer_financial_accounts%rowtype;
  request_id uuid:=gen_random_uuid();
  minimum_cents integer;
begin
  if requested_currency<>'BRL' then raise exception 'Moeda inválida.'; end if;
  select payout_minimum_cents into minimum_cents from public.platform_financial_settings where id=true;
  if requested_amount_cents<coalesce(minimum_cents,5000) then raise exception 'Valor abaixo do mínimo de repasse.'; end if;
  select * into account_row from public.producer_financial_accounts where producer_id='22222222-2222-4222-8222-222222222222'::uuid for update;
  if not found then raise exception 'Conta financeira não encontrada.'; end if;
  if requested_amount_cents>account_row.eligible_balance_cents then raise exception 'Saldo elegível insuficiente.'; end if;
  if not exists(select 1 from public.producer_payout_methods where id=target_method_id and producer_id=account_row.producer_id and verified=true) then
    raise exception 'Método de repasse inválido ou não verificado.';
  end if;
  insert into public.producer_payout_requests(id,producer_id,payout_method_id,amount_cents,currency,status)
  values(request_id,account_row.producer_id,target_method_id,requested_amount_cents,'BRL','requested');
  update public.producer_financial_accounts
  set eligible_balance_cents=eligible_balance_cents-requested_amount_cents,
      current_balance_cents=current_balance_cents-requested_amount_cents,
      updated_at=now()
  where id=account_row.id;
  return request_id;
end;
$$;

revoke all on function public.request_demo_producer_payout(uuid,bigint,text) from public;
grant execute on function public.request_demo_producer_payout(uuid,bigint,text) to anon,authenticated;
