create or replace function app_private.transition_demo_affiliate_withdrawal(
  target_withdrawal_id uuid,
  target_status text
)
returns public.affiliate_withdrawals
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  withdrawal_row public.affiliate_withdrawals%rowtype;
  profile_row public.affiliate_profiles%rowtype;
  normalized_status text := lower(trim(target_status));
begin
  if normalized_status not in ('processing', 'paid', 'rejected', 'canceled') then
    raise exception 'Status de saque inválido.' using errcode = '22023';
  end if;

  select w.* into withdrawal_row
  from public.affiliate_withdrawals w
  join public.affiliate_profiles p on p.id = w.affiliate_id
  where w.id = target_withdrawal_id
    and p.is_demo = true
  for update of w;

  if not found then
    raise exception 'Solicitação de saque demo não encontrada.' using errcode = 'P0002';
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
      and is_demo = true
    for update;

    if not found then
      raise exception 'Perfil de afiliado demo não encontrado.' using errcode = 'P0002';
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

revoke all on function app_private.transition_demo_affiliate_withdrawal(uuid, text) from public, authenticated;
grant execute on function app_private.transition_demo_affiliate_withdrawal(uuid, text) to anon, service_role;
grant usage on schema app_private to anon, service_role;

create or replace function public.transition_demo_affiliate_withdrawal(
  target_withdrawal_id uuid,
  target_status text
)
returns public.affiliate_withdrawals
language sql
security invoker
set search_path = public, app_private, pg_temp
as $$
  select app_private.transition_demo_affiliate_withdrawal(target_withdrawal_id, target_status);
$$;

revoke all on function public.transition_demo_affiliate_withdrawal(uuid, text) from public, authenticated;
grant execute on function public.transition_demo_affiliate_withdrawal(uuid, text) to anon, service_role;
