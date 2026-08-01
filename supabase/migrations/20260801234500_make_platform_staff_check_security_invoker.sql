create or replace function public.is_platform_staff()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles
    where user_id = (select auth.uid())
      and role in ('admin', 'super_admin')
  );
$$;

grant execute on function public.is_platform_staff() to authenticated;
revoke execute on function public.is_platform_staff() from public, anon;
