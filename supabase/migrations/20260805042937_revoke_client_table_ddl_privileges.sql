-- TRUNCATE bypasses row-level security, while REFERENCES and TRIGGER are DDL
-- capabilities that API client roles do not need. Remove these privileges from
-- all current public objects and from future tables created by the migration
-- owner. Supabase-managed owner defaults require platform-level configuration.

revoke truncate, references, trigger
on all tables in schema public
from anon, authenticated;

alter default privileges in schema public
revoke truncate, references, trigger on tables
from anon, authenticated;
