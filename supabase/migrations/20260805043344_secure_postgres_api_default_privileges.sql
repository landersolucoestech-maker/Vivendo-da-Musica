-- New database objects must not become API-accessible automatically. Preserve
-- owner and service-role defaults; require explicit grants for anon and
-- authenticated on every future table, sequence, and function.

alter default privileges in schema public
revoke all privileges on tables
from anon, authenticated;

alter default privileges in schema public
revoke execute on functions
from public, anon, authenticated;

alter default privileges in schema public
revoke all privileges on sequences
from anon, authenticated;
