create or replace function app_private.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.user_profiles
  where user_id = (select auth.uid());
$$;

create or replace function app_private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(app_private.current_role() in ('admin', 'super_admin'), false);
$$;

create or replace function app_private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(app_private.current_role() in ('instructor', 'admin', 'super_admin'), false);
$$;

create or replace function app_private.is_beat_owner(target_beat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.beats
    where id = target_beat_id
      and producer_id = (select auth.uid())
  );
$$;

create or replace function app_private.is_course_staff(target_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app_private.is_admin() or exists (
    select 1
    from public.courses
    where id = target_course_id
      and instructor_id = (select auth.uid())
  );
$$;

create or replace function app_private.is_enrolled(target_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.enrollments
    where user_id = (select auth.uid())
      and course_id = target_course_id
      and status = 'active'
  );
$$;

revoke all on function app_private.current_role() from public, anon, authenticated, service_role;
revoke all on function app_private.is_admin() from public, anon, authenticated, service_role;
revoke all on function app_private.is_staff() from public, anon, authenticated, service_role;
revoke all on function app_private.is_beat_owner(uuid) from public, anon, authenticated, service_role;
revoke all on function app_private.is_course_staff(uuid) from public, anon, authenticated, service_role;
revoke all on function app_private.is_enrolled(uuid) from public, anon, authenticated, service_role;
