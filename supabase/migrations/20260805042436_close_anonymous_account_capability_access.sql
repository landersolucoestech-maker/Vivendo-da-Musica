-- Capability helpers require an authenticated identity. The demo mutation RPC
-- was not functional for anon because account_capabilities has no anon RLS
-- write policy, so remove the dead anonymous exposure and its table grant.

revoke execute on function public.current_account_capabilities() from public, anon;
revoke execute on function public.has_account_capability(text) from public, anon;
revoke execute on function public.request_demo_account_capability(uuid, text) from public, anon;

grant execute on function public.current_account_capabilities() to authenticated, service_role;
grant execute on function public.has_account_capability(text) to authenticated, service_role;
grant execute on function public.request_demo_account_capability(uuid, text) to authenticated, service_role;

revoke select on table public.account_capabilities from public, anon;
