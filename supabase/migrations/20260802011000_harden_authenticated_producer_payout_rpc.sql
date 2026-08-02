create or replace function public.request_producer_payout(
  target_method_id uuid,
  requested_amount_cents bigint,
  requested_currency text
)
returns uuid
language sql
security definer
set search_path = public, app_private, pg_temp
as $$
  select app_private.request_producer_payout(
    target_method_id,
    requested_amount_cents,
    requested_currency
  );
$$;

revoke all on function app_private.request_producer_payout(uuid, bigint, text) from public, anon, authenticated;
grant execute on function app_private.request_producer_payout(uuid, bigint, text) to service_role;

revoke all on function public.request_producer_payout(uuid, bigint, text) from public, anon;
grant execute on function public.request_producer_payout(uuid, bigint, text) to authenticated, service_role;
