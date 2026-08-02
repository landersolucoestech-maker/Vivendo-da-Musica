create schema if not exists app_private;

revoke all on schema app_private from public;
revoke all on schema app_private from anon;
grant usage on schema app_private to authenticated, service_role;

create or replace function app_private.request_producer_payout(
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
  actor_id uuid := auth.uid();
  actor_role text;
  account_row public.producer_financial_accounts%rowtype;
  minimum_cents bigint;
  normalized_currency text := upper(trim(requested_currency));
  request_id uuid := gen_random_uuid();
begin
  if actor_id is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  select role into actor_role
  from public.user_profiles
  where user_id = actor_id;

  if actor_role is distinct from 'producer' then
    raise exception 'Apenas produtores podem solicitar repasses.' using errcode = '42501';
  end if;

  if requested_amount_cents is null or requested_amount_cents <= 0 then
    raise exception 'Valor de repasse inválido.' using errcode = '22023';
  end if;

  select * into account_row
  from public.producer_financial_accounts
  where producer_id = actor_id
  for update;

  if not found then
    raise exception 'Conta financeira não encontrada.' using errcode = 'P0002';
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
      and producer_id = actor_id
      and verified = true
  ) then
    raise exception 'Método de repasse inválido ou não verificado.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.producer_payout_requests
    where producer_id = actor_id
      and status in ('requested', 'processing')
  ) then
    raise exception 'Já existe um repasse pendente ou em processamento.' using errcode = '23505';
  end if;

  insert into public.producer_payout_requests (
    id,
    producer_id,
    payout_method_id,
    amount_cents,
    currency,
    status
  ) values (
    request_id,
    actor_id,
    target_method_id,
    requested_amount_cents,
    account_row.currency,
    'requested'
  );

  update public.producer_financial_accounts
  set eligible_balance_cents = eligible_balance_cents - requested_amount_cents,
      current_balance_cents = current_balance_cents - requested_amount_cents,
      updated_at = now()
  where id = account_row.id;

  return request_id;
end;
$$;

revoke all on function app_private.request_producer_payout(uuid, bigint, text) from public, anon;
grant execute on function app_private.request_producer_payout(uuid, bigint, text) to authenticated, service_role;

create or replace function public.request_producer_payout(
  target_method_id uuid,
  requested_amount_cents bigint,
  requested_currency text
)
returns uuid
language sql
security invoker
set search_path = public, app_private, pg_temp
as $$
  select app_private.request_producer_payout(
    target_method_id,
    requested_amount_cents,
    requested_currency
  );
$$;

revoke all on function public.request_producer_payout(uuid, bigint, text) from public, anon;
grant execute on function public.request_producer_payout(uuid, bigint, text) to authenticated, service_role;
