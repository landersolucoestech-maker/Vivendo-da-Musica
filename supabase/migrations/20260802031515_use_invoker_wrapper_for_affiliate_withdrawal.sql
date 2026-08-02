create or replace function public.request_affiliate_withdrawal(
  requested_amount_cents bigint,
  requested_payment_method text
)
returns uuid
language sql
security invoker
set search_path = public, app_private, pg_temp
as $$
  select app_private.request_affiliate_withdrawal(
    requested_amount_cents,
    requested_payment_method
  );
$$;

grant usage on schema app_private to authenticated, service_role;
grant execute on function app_private.request_affiliate_withdrawal(bigint, text) to authenticated, service_role;

revoke all on function public.request_affiliate_withdrawal(bigint, text) from public, anon;
grant execute on function public.request_affiliate_withdrawal(bigint, text) to authenticated, service_role;
