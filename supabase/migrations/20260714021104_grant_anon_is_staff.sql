-- Public RLS policies call this helper to allow owners/staff in addition to
-- anonymous rows. Anonymous requests need EXECUTE even though the helper
-- correctly returns false when auth.uid() is null.
grant execute on function public.is_staff() to anon;
