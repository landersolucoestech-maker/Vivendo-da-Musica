-- Reconstruct grants that existed only as remote drift and are required by the
-- canonical RLS/RPC model. Authorization wrappers are SECURITY INVOKER, so
-- clients need schema USAGE but never CREATE.

grant usage on schema authz_private
to anon, authenticated, service_role;

revoke create on schema authz_private
from public, anon, authenticated, service_role;

grant select on table public.admin_audit_logs
to anon, authenticated;

grant insert on table public.admin_audit_logs
to authenticated;

grant insert on table public.contact_messages
to anon, authenticated;
