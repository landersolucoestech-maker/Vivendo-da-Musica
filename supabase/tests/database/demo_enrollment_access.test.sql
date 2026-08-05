begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename = 'enrollments'
      and policyname = 'dev_full_access_enrollments'
  ),
  0::bigint,
  'unrestricted development enrollment policy is absent'
);

select ok(
  has_table_privilege('anon', 'public.enrollments', 'SELECT'),
  'anonymous preview retains enrollment read access'
);

select ok(
  not has_table_privilege('anon', 'public.enrollments', 'INSERT'),
  'anonymous users cannot insert enrollments'
);

select ok(
  not has_table_privilege('anon', 'public.enrollments', 'UPDATE'),
  'anonymous users cannot update enrollments'
);

select ok(
  not has_table_privilege('anon', 'public.enrollments', 'DELETE'),
  'anonymous users cannot delete enrollments'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename = 'enrollments'
      and policyname = 'dev_student_enrollments_read'
      and qual ilike '%profile.is_demo = true%'
  ),
  1::bigint,
  'demo enrollment reads require a demo student profile'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename = 'enrollments'
      and policyname = 'dev_student_enrollments_read'
      and qual ilike '%course.is_demo = true%'
  ),
  1::bigint,
  'demo enrollment reads require a demo course'
);

select * from finish();
rollback;
