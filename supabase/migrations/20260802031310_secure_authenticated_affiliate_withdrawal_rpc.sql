create schema if not exists app_private;

create or replace function app_private.request_affiliate_withdrawal(
  requested_amount_cents bigint,
  requested_payment_method text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  profile_row public.affiliate_profiles%rowtype;
  normalized_method text := lower(trim(requested_payment_method));
  withdrawal_id uuid := gen_random_uuid();
begin
  if actor_id is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  if requested_amount_cents is null or requested_amount_cents < 1000 then
    raise exception 'O valor mínimo para saque é R$ 10,00.' using errcode = '22023';
  end if;

  if normalized_method not in ('pix', 'bank_transfer') then
    raise exception 'Forma de pagamento inválida.' using errcode = '22023';
  end if;

  select * into profile_row
  from public.affiliate_profiles
  where user_id = actor_id
  for update;

  if not found then
    raise exception 'Perfil de afiliado não encontrado.' using errcode = 'P0002';
  end if;

  if profile_row.status <> 'active' then
    raise exception 'O perfil de afiliado não está ativo.' using errcode = '42501';
  end if;

  if requested_amount_cents > profile_row.balance_cents then
    raise exception 'O valor solicitado excede o saldo disponível.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.affiliate_withdrawals
    where affiliate_id = profile_row.id
      and status in ('requested', 'processing')
  ) then
    raise exception 'Já existe um saque pendente ou em processamento.' using errcode = '23505';
  end if;

  insert into public.affiliate_withdrawals (
    id,
    affiliate_id,
    amount_cents,
    status,
    payment_method
  ) values (
    withdrawal_id,
    profile_row.id,
    requested_amount_cents,
    'requested',
    normalized_method
  );

  update public.affiliate_profiles
  set balance_cents = balance_cents - requested_amount_cents,
      updated_at = now()
  where id = profile_row.id;

  return withdrawal_id;
end;
$$;

revoke all on function app_private.request_affiliate_withdrawal(bigint, text) from public, anon, authenticated;
grant execute on function app_private.request_affiliate_withdrawal(bigint, text) to service_role;

create or replace function public.request_affiliate_withdrawal(
  requested_amount_cents bigint,
  requested_payment_method text
)
returns uuid
language sql
security definer
set search_path = public, app_private, pg_temp
as $$
  select app_private.request_affiliate_withdrawal(
    requested_amount_cents,
    requested_payment_method
  );
$$;

revoke all on function public.request_affiliate_withdrawal(bigint, text) from public, anon;
grant execute on function public.request_affiliate_withdrawal(bigint, text) to authenticated, service_role;
