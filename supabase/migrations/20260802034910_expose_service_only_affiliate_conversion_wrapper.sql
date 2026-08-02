create or replace function public.record_affiliate_checkout_conversion(
  target_order_id uuid,
  target_order_kind text,
  target_referral_slug text
)
returns uuid
language sql
security invoker
set search_path = public, app_private, pg_temp
as $$
  select app_private.record_affiliate_checkout_conversion(
    target_order_id,
    target_order_kind,
    target_referral_slug
  );
$$;

revoke all on function public.record_affiliate_checkout_conversion(uuid,text,text) from public, anon, authenticated;
grant execute on function public.record_affiliate_checkout_conversion(uuid,text,text) to service_role;
