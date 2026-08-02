create or replace function app_private.request_demo_producer_payout(
  target_method_id uuid,
  requested_amount_cents bigint,
  requested_currency text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  demo_producer_id constant uuid := '22222222-2222-4222-8222-222222222222'::uuid;
  account_row public.producer_financial_accounts%rowtype;
  minimum_cents bigint;
  normalized_currency text := upper(trim(requested_currency));
  request_id uuid := gen_random_uuid();
begin
  if requested_amount_cents is null or requested_amount_cents <= 0 then
    raise exception 'Valor de repasse inválido.' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.user_profiles
    where user_id = demo_producer_id
      and role = 'producer'
      and is_demo = true
  ) then
    raise exception 'Produtor de demonstração indisponível.' using errcode = 'P0002';
  end if;

  select * into account_row
  from public.producer_financial_accounts
  where producer_id = demo_producer_id
  for update;

  if not found then
    raise exception 'Conta financeira de demonstração não encontrada.' using errcode = 'P0002';
  end if;

  if normalized_currency is distinct from upper(account_row.currency) then
    raise exception 'Moeda inválida para esta conta.' using errcode = '22023';
  end if;

  select payout_minimum_cents::bigint into minimum_cents
  from public.platform_financial_settings
  where id = true;

  minimum_cents := coalesce(minimum_cents, 5000);

  if requested_amount_cents < minimum_cents then
    raise exception 'Valor abaixo do mínimo de repasse.' using errcode = '22023';
  end if;

  if requested_amount_cents > account_row.eligible_balance_cents
     or requested_amount_cents > account_row.current_balance_cents then
    raise exception 'Saldo elegível insuficiente.' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.producer_payout_methods
    where id = target_method_id
      and producer_id = demo_producer_id
      and verified = true
  ) then
    raise exception 'Método de repasse inválido ou não verificado.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.producer_payout_requests
    where producer_id = demo_producer_id
      and status in ('requested', 'processing')
  ) then
    raise exception 'Já existe um repasse pendente ou em processamento.' using errcode = '23505';
  end if;

  insert into public.producer_payout_requests (
    id, producer_id, payout_method_id, amount_cents, currency, status
  ) values (
    request_id, demo_producer_id, target_method_id,
    requested_amount_cents, account_row.currency, 'requested'
  );

  update public.producer_financial_accounts
  set eligible_balance_cents = eligible_balance_cents - requested_amount_cents,
      current_balance_cents = current_balance_cents - requested_amount_cents,
      updated_at = now()
  where id = account_row.id;

  return request_id;
end;
$$;

create or replace function public.request_demo_producer_payout(
  target_method_id uuid,
  requested_amount_cents bigint,
  requested_currency text
)
returns uuid
language sql
security invoker
set search_path = public, app_private, pg_temp
as $$
  select app_private.request_demo_producer_payout(
    target_method_id,
    requested_amount_cents,
    requested_currency
  );
$$;

create or replace function public.transition_demo_producer_payout(
  target_request_id uuid,
  target_status text
)
returns public.producer_payout_requests
language sql
security invoker
set search_path = public, app_private, pg_temp
as $$
  select app_private.transition_demo_producer_payout(target_request_id, target_status);
$$;

grant usage on schema app_private to anon, service_role;
revoke all on function app_private.request_demo_producer_payout(uuid, bigint, text) from public, authenticated;
grant execute on function app_private.request_demo_producer_payout(uuid, bigint, text) to anon, service_role;
revoke all on function app_private.transition_demo_producer_payout(uuid, text) from public, authenticated;
grant execute on function app_private.transition_demo_producer_payout(uuid, text) to anon, service_role;

revoke all on function public.request_demo_producer_payout(uuid, bigint, text) from public, authenticated;
grant execute on function public.request_demo_producer_payout(uuid, bigint, text) to anon, service_role;
revoke all on function public.transition_demo_producer_payout(uuid, text) from public, authenticated;
grant execute on function public.transition_demo_producer_payout(uuid, text) to anon, service_role;
