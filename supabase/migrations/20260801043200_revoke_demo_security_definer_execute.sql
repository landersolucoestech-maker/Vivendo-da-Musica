-- Restrict legacy demo SECURITY DEFINER RPCs to trusted server-side execution.
-- These functions are not referenced by the application frontend and must not
-- be callable through PostgREST by anonymous or regular authenticated users.

revoke execute on function public.list_demo_contact_messages()
from public, anon, authenticated;

revoke execute on function public.request_demo_affiliate_withdrawal(bigint, text)
from public, anon, authenticated;

revoke execute on function public.request_demo_producer_payout(uuid, bigint, text)
from public, anon, authenticated;

revoke execute on function public.toggle_demo_integration(text)
from public, anon, authenticated;

revoke execute on function public.update_demo_contact_message_status(uuid, text)
from public, anon, authenticated;

grant execute on function public.list_demo_contact_messages()
to service_role;

grant execute on function public.request_demo_affiliate_withdrawal(bigint, text)
to service_role;

grant execute on function public.request_demo_producer_payout(uuid, bigint, text)
to service_role;

grant execute on function public.toggle_demo_integration(text)
to service_role;

grant execute on function public.update_demo_contact_message_status(uuid, text)
to service_role;
