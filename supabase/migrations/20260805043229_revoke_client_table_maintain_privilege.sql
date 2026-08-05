-- PostgreSQL MAINTAIN permits administrative table operations that API client
-- roles do not need. Remove it from all current public objects and from future
-- tables created by the migration owner.

revoke maintain
on all tables in schema public
from anon, authenticated;

alter default privileges in schema public
revoke maintain on tables
from anon, authenticated;
