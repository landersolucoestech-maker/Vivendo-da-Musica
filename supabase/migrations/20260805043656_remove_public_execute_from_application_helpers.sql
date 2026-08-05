-- These application helpers already grant EXECUTE explicitly to anon,
-- authenticated, and service_role. Remove PUBLIC so future roles do not inherit
-- access automatically.

revoke execute on function public.current_role() from public;
revoke execute on function public.is_admin() from public;
revoke execute on function public.is_beat_owner(uuid) from public;
revoke execute on function public.is_course_staff(uuid) from public;
revoke execute on function public.is_enrolled(uuid) from public;
revoke execute on function public.is_staff() from public;
revoke execute on function public.resolve_commercial_parameter(text, text, uuid, timestamptz) from public;
