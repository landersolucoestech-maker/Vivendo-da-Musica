create or replace function app_private.is_platform_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from app_private.platform_staff staff
    where staff.user_id = (select auth.uid())
      and staff.status = 'active'
  );
$$;

create or replace function app_private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app_private.is_platform_staff();
$$;

create or replace function app_private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    app_private.is_platform_staff()
    or exists (
      select 1
      from public.account_capabilities capability
      where capability.user_id = (select auth.uid())
        and capability.capability = 'instructor'
        and capability.status = 'active'
    );
$$;

create or replace function app_private.is_course_staff(target_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    app_private.is_platform_staff()
    or exists (
      select 1
      from public.courses course_row
      where course_row.id = target_course_id
        and course_row.instructor_id = (select auth.uid())
    );
$$;

revoke all on function app_private.is_platform_staff() from public, anon, authenticated, service_role;
revoke all on function app_private.is_admin() from public, anon, authenticated, service_role;
revoke all on function app_private.is_staff() from public, anon, authenticated, service_role;
revoke all on function app_private.is_course_staff(uuid) from public, anon, authenticated, service_role;

grant usage on schema app_private to anon, authenticated, service_role;
revoke create on schema app_private from public, anon, authenticated, service_role;

grant execute on function app_private.is_platform_staff() to anon, authenticated, service_role;
grant execute on function app_private.is_admin() to anon, authenticated, service_role;
grant execute on function app_private.is_staff() to anon, authenticated, service_role;
grant execute on function app_private.is_course_staff(uuid) to anon, authenticated, service_role;

create or replace function public.is_platform_staff()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select app_private.is_platform_staff();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select app_private.is_platform_staff();
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select app_private.is_staff();
$$;

revoke all on function public.is_platform_staff() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.is_staff() from public;

grant execute on function public.is_platform_staff() to anon, authenticated, service_role;
grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.is_staff() to anon, authenticated, service_role;
