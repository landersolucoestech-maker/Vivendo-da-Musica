-- Shared authorization predicate required by the development domains introduced
-- after the historical schema. The remote Supabase branch already contains this
-- function, but its migration was missing from the repository.
create or replace function public.is_platform_staff()
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles
    where user_id = (select auth.uid())
      and role in ('admin', 'super_admin')
  );
$$;

grant execute on function public.is_platform_staff() to anon, authenticated;
