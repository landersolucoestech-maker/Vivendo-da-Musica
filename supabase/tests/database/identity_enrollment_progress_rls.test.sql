begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename in ('user_profiles', 'enrollments', 'lesson_progress')
      and 'public' = any(roles)
  ),
  0::bigint,
  'identity, enrollment and progress tables have no legacy public policies'
);

select is(
  (
    select count(*)::bigint
    from (
      select tablename, cmd, role_name
      from pg_policies
      cross join lateral unnest(roles) as role_name
      where schemaname = 'public'
        and tablename in ('user_profiles', 'enrollments', 'lesson_progress')
      group by tablename, cmd, role_name
      having count(*) > 1
    ) as duplicates
  ),
  0::bigint,
  'identity, enrollment and progress policies are unique per role and action'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_profiles'
      and policyname = 'user_profiles_owner_update'
      and with_check ilike '%role = current_role()%'
  ),
  1::bigint,
  'authenticated profile updates preserve the persisted role'
);

select ok(
  not has_column_privilege('authenticated', 'public.user_profiles', 'role', 'UPDATE'),
  'authenticated clients cannot update the profile role column'
);

select ok(
  not has_column_privilege('anon', 'public.user_profiles', 'role', 'UPDATE'),
  'anonymous clients cannot update the profile role column'
);

select ok(
  has_column_privilege('anon', 'public.user_profiles', 'full_name', 'UPDATE')
  and has_column_privilege('anon', 'public.user_profiles', 'avatar_url', 'UPDATE'),
  'anonymous DEV profile editing remains limited to display fields'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename = 'enrollments'
      and policyname in ('enrollments_course_staff_insert', 'enrollments_course_staff_update')
      and coalesce(with_check, '') ilike '%is_course_staff(course_id)%'
  ),
  2::bigint,
  'enrollment writes remain restricted to course staff'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename = 'lesson_progress'
      and policyname in (
        'dev_student_progress_insert',
        'dev_student_progress_read',
        'dev_student_progress_update'
      )
      and (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ilike '%course.is_demo = true%'
  ),
  3::bigint,
  'all anonymous progress policies require a demo course'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename = 'lesson_progress'
      and policyname = 'lesson_progress_authenticated_select'
      and qual ilike '%is_course_staff(module.course_id)%'
  ),
  1::bigint,
  'course staff retain student progress visibility'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename = 'lesson_progress'
      and 'authenticated' = any(roles)
      and cmd in ('INSERT', 'SELECT', 'UPDATE')
  ),
  3::bigint,
  'lesson progress has one authenticated policy per supported action'
);

select * from finish();
rollback;
