begin;

-- Keep privileged authorization reads outside the API-exposed public schema.
-- These helpers return booleans or the current caller's role only; they do not
-- expose profile, course, enrollment or marketplace records.
create schema if not exists authz_private;

revoke all on schema authz_private from public, anon, authenticated;
grant usage on schema authz_private to anon, authenticated, service_role;

create or replace function authz_private.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select profile.role
  from public.user_profiles profile
  where profile.user_id = (select auth.uid())
  limit 1;
$$;

create or replace function authz_private.is_beat_owner(target_beat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.beats beat
    where beat.id = target_beat_id
      and beat.producer_id = (select auth.uid())
  );
$$;

create or replace function authz_private.is_course_staff(target_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select coalesce(
    authz_private.current_user_role() in ('admin', 'super_admin'),
    false
  ) or exists (
    select 1
    from public.courses course
    where course.id = target_course_id
      and course.instructor_id = (select auth.uid())
  );
$$;

create or replace function authz_private.is_enrolled(target_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.enrollments enrollment
    where enrollment.user_id = (select auth.uid())
      and enrollment.course_id = target_course_id
      and enrollment.status = 'active'
  );
$$;

revoke all on function authz_private.current_user_role()
from public, anon, authenticated;
revoke all on function authz_private.is_beat_owner(uuid)
from public, anon, authenticated;
revoke all on function authz_private.is_course_staff(uuid)
from public, anon, authenticated;
revoke all on function authz_private.is_enrolled(uuid)
from public, anon, authenticated;

grant execute on function authz_private.current_user_role()
to anon, authenticated, service_role;
grant execute on function authz_private.is_beat_owner(uuid)
to anon, authenticated, service_role;
grant execute on function authz_private.is_course_staff(uuid)
to anon, authenticated, service_role;
grant execute on function authz_private.is_enrolled(uuid)
to anon, authenticated, service_role;

-- Public authorization predicates remain available to RLS and application
-- queries, but execute with invoker rights and delegate the RLS-bypassing read
-- to the non-exposed authz_private schema. This prevents user_profiles,
-- courses, beats and enrollments policies from recursively evaluating their
-- own helper functions.
create or replace function public."current_role"()
returns public.user_role
language sql
stable
security invoker
set search_path = authz_private, public, pg_temp
as $$
  select authz_private.current_user_role();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = authz_private, public, pg_temp
as $$
  select coalesce(
    authz_private.current_user_role() in ('admin', 'super_admin'),
    false
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security invoker
set search_path = authz_private, public, pg_temp
as $$
  select coalesce(
    authz_private.current_user_role() in ('instructor', 'admin', 'super_admin'),
    false
  );
$$;

create or replace function public.is_platform_staff()
returns boolean
language sql
stable
security invoker
set search_path = authz_private, public, pg_temp
as $$
  select coalesce(
    authz_private.current_user_role() in ('admin', 'super_admin'),
    false
  );
$$;

create or replace function public.is_beat_owner(target_beat_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = authz_private, public, pg_temp
as $$
  select authz_private.is_beat_owner(target_beat_id);
$$;

create or replace function public.is_course_staff(target_course_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = authz_private, public, pg_temp
as $$
  select authz_private.is_course_staff(target_course_id);
$$;

create or replace function public.is_enrolled(target_course_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = authz_private, public, pg_temp
as $$
  select authz_private.is_enrolled(target_course_id);
$$;

revoke all on function public."current_role"()
from public, anon, authenticated;
revoke all on function public.is_admin()
from public, anon, authenticated;
revoke all on function public.is_staff()
from public, anon, authenticated;
revoke all on function public.is_platform_staff()
from public, anon, authenticated;
revoke all on function public.is_beat_owner(uuid)
from public, anon, authenticated;
revoke all on function public.is_course_staff(uuid)
from public, anon, authenticated;
revoke all on function public.is_enrolled(uuid)
from public, anon, authenticated;

grant execute on function public."current_role"()
to anon, authenticated, service_role;
grant execute on function public.is_admin()
to anon, authenticated, service_role;
grant execute on function public.is_staff()
to anon, authenticated, service_role;
grant execute on function public.is_platform_staff()
to anon, authenticated, service_role;
grant execute on function public.is_beat_owner(uuid)
to anon, authenticated, service_role;
grant execute on function public.is_course_staff(uuid)
to anon, authenticated, service_role;
grant execute on function public.is_enrolled(uuid)
to anon, authenticated, service_role;

-- Defense in depth: no SECURITY DEFINER function in the API-exposed public
-- schema may retain direct execution grants for client roles.
do $$
declare
  target_function text;
begin
  for target_function in
    select function_proc.oid::regprocedure::text
    from pg_proc function_proc
    join pg_namespace namespace on namespace.oid = function_proc.pronamespace
    where namespace.nspname = 'public'
      and function_proc.prosecdef
  loop
    execute format(
      'revoke execute on function %s from public, anon, authenticated',
      target_function
    );
  end loop;
end;
$$;

commit;
