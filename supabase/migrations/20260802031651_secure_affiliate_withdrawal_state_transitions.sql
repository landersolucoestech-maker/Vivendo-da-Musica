create or replace function app_private.transition_affiliate_withdrawal(
  target_withdrawal_id uuid,
  target_status text
)
returns public.affiliate_withdrawals
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  withdrawal_row public.affiliate_withdrawals%rowtype;
  profile_row public.affiliate_profiles%rowtype;
  normalized_status text := lower(trim(target_status));
begin
  if actor_id is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  if not public.is_platform_staff() then
    raise exception 'Apenas a equipe financeira pode alterar saques.' using errcode = '42501';
  end if;

  if normalized_status not in ('processing', 'paid', 'rejected', 'canceled') then
    raise exception 'Status de saque inválido.' using errcode = '22023';
  end if;

  select * into withdrawal_row
  from public.affiliate_withdrawals
  where id = target_withdrawal_id
  for update;

  if not found then
    raise exception 'Solicitação de saque não encontrada.' using errcode = 'P0002';
  end if;

  if withdrawal_row.status in ('paid', 'rejected', 'canceled') then
    raise exception 'Saque já está em estado terminal.' using errcode = '22023';
  end if;

  if withdrawal_row.status = 'requested' and normalized_status not in ('processing', 'rejected', 'canceled') then
    raise exception 'Transição de saque inválida.' using errcode = '22023';
  end if;

  if withdrawal_row.status = 'processing' and normalized_status not in ('paid', 'rejected', 'canceled') then
    raise exception 'Transição de saque inválida.' using errcode = '22023';
  end if;

  if normalized_status in ('rejected', 'canceled') then
    select * into profile_row
    from public.affiliate_profiles
    where id = withdrawal_row.affiliate_id
    for update;

    if not found then
      raise exception 'Perfil de afiliado não encontrado.' using errcode = 'P0002';
    end if;

    update public.affiliate_profiles
    set balance_cents = balance_cents + withdrawal_row.amount_cents,
        updated_at = now()
    where id = profile_row.id;
  end if;

  update public.affiliate_withdrawals
  set status = normalized_status,
      processed_at = case when normalized_status in ('paid', 'rejected', 'canceled') then now() else null end,
      updated_at = now()
  where id = withdrawal_row.id
  returning * into withdrawal_row;

  return withdrawal_row;
end;
$$;

revoke all on function app_private.transition_affiliate_withdrawal(uuid, text) from public, anon, authenticated;
grant execute on function app_private.transition_affiliate_withdrawal(uuid, text) to authenticated, service_role;

grant usage on schema app_private to authenticated, service_role;

create or replace function public.transition_affiliate_withdrawal(
  target_withdrawal_id uuid,
  target_status text
)
returns public.affiliate_withdrawals
language sql
security invoker
set search_path = public, app_private, pg_temp
as $$
  select app_private.transition_affiliate_withdrawal(target_withdrawal_id, target_status);
$$;

revoke all on function public.transition_affiliate_withdrawal(uuid, text) from public, anon;
grant execute on function public.transition_affiliate_withdrawal(uuid, text) to authenticated, service_role;
