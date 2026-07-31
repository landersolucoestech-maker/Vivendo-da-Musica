create or replace function public.request_demo_affiliate_withdrawal(
  requested_amount_cents bigint,
  requested_payment_method text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_profile public.affiliate_profiles%rowtype;
  withdrawal_id uuid := gen_random_uuid();
begin
  if requested_amount_cents < 1000 then
    raise exception 'O valor mínimo para saque é R$ 10,00.';
  end if;

  if requested_payment_method not in ('pix', 'bank_transfer') then
    raise exception 'Forma de pagamento inválida.';
  end if;

  select *
    into target_profile
    from public.affiliate_profiles
   where is_demo = true
   order by created_at asc
   limit 1
   for update;

  if not found or target_profile.status <> 'active' then
    raise exception 'Perfil de afiliado de desenvolvimento indisponível.';
  end if;

  if requested_amount_cents > target_profile.balance_cents then
    raise exception 'O valor solicitado excede o saldo disponível.';
  end if;

  insert into public.affiliate_withdrawals (
    id,
    affiliate_id,
    amount_cents,
    status,
    payment_method,
    requested_at
  ) values (
    withdrawal_id,
    target_profile.id,
    requested_amount_cents,
    'requested',
    requested_payment_method,
    now()
  );

  update public.affiliate_profiles
     set balance_cents = balance_cents - requested_amount_cents,
         updated_at = now()
   where id = target_profile.id;

  return withdrawal_id;
end;
$$;

revoke all on function public.request_demo_affiliate_withdrawal(bigint, text) from public;
grant execute on function public.request_demo_affiliate_withdrawal(bigint, text) to anon, authenticated;
