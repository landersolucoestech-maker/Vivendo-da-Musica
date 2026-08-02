create or replace function public.transition_demo_producer_payout(
  target_request_id uuid,
  target_status text
)
returns public.producer_payout_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  demo_producer_id constant uuid := '22222222-2222-4222-8222-222222222222'::uuid;
  request_row public.producer_payout_requests%rowtype;
  account_row public.producer_financial_accounts%rowtype;
  normalized_status text := lower(trim(target_status));
begin
  if normalized_status not in ('processing', 'paid', 'failed', 'canceled') then
    raise exception 'Status de repasse inválido.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.user_profiles
    where user_id = demo_producer_id
      and role = 'producer'
      and is_demo = true
  ) then
    raise exception 'Produtor de demonstração indisponível.' using errcode = 'P0002';
  end if;

  select * into request_row
  from public.producer_payout_requests
  where id = target_request_id
    and producer_id = demo_producer_id
  for update;

  if not found then
    raise exception 'Solicitação de repasse de demonstração não encontrada.' using errcode = 'P0002';
  end if;

  if request_row.status in ('paid', 'failed', 'canceled') then
    raise exception 'Repasse já está em estado terminal.' using errcode = '22023';
  end if;

  if request_row.status = 'requested' and normalized_status not in ('processing', 'failed', 'canceled') then
    raise exception 'Transição de repasse inválida.' using errcode = '22023';
  end if;

  if request_row.status = 'processing' and normalized_status not in ('paid', 'failed', 'canceled') then
    raise exception 'Transição de repasse inválida.' using errcode = '22023';
  end if;

  if normalized_status in ('failed', 'canceled') then
    select * into account_row
    from public.producer_financial_accounts
    where producer_id = demo_producer_id
    for update;

    if not found then
      raise exception 'Conta financeira de demonstração não encontrada.' using errcode = 'P0002';
    end if;

    if upper(account_row.currency) is distinct from upper(request_row.currency) then
      raise exception 'Moeda da conta financeira divergente.' using errcode = '22023';
    end if;

    update public.producer_financial_accounts
    set current_balance_cents = current_balance_cents + request_row.amount_cents,
        eligible_balance_cents = eligible_balance_cents + request_row.amount_cents,
        updated_at = now()
    where id = account_row.id;
  end if;

  update public.producer_payout_requests
  set status = normalized_status,
      processed_at = case when normalized_status in ('paid', 'failed', 'canceled') then now() else null end
  where id = request_row.id
  returning * into request_row;

  return request_row;
end;
$$;

revoke all on function public.transition_demo_producer_payout(uuid, text) from public, authenticated;
grant execute on function public.transition_demo_producer_payout(uuid, text) to anon, service_role;
