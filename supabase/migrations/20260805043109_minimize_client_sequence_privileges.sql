-- API clients must not call setval or inspect sequence state. Remove all
-- sequence privileges, restore only the USAGE required by the authenticated
-- staff audit-log INSERT flow, and require future sequence grants to be
-- explicit.

revoke all privileges
on all sequences in schema public
from anon, authenticated;

grant usage
on sequence public.admin_audit_logs_id_seq
to authenticated;

alter default privileges in schema public
revoke all privileges on sequences
from anon, authenticated;
