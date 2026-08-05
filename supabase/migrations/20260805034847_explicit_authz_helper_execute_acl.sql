-- Authorization helpers are intentionally called through public SECURITY
-- INVOKER wrappers and RLS policies. Preserve the required API roles
-- explicitly instead of inheriting PostgreSQL's default EXECUTE for PUBLIC.

revoke execute on function authz_private.current_user_role() from public;
revoke execute on function authz_private.is_beat_owner(uuid) from public;
revoke execute on function authz_private.is_course_staff(uuid) from public;
revoke execute on function authz_private.is_enrolled(uuid) from public;

grant execute on function authz_private.current_user_role()
to anon, authenticated, service_role;

grant execute on function authz_private.is_beat_owner(uuid)
to anon, authenticated, service_role;

grant execute on function authz_private.is_course_staff(uuid)
to anon, authenticated, service_role;

grant execute on function authz_private.is_enrolled(uuid)
to anon, authenticated, service_role;
