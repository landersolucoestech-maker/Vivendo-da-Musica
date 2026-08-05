begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename in ('courses', 'course_modules', 'lessons')
      and 'public' = any(roles)
  ),
  0::bigint,
  'course-domain tables have no legacy public-role policies'
);

select is(
  (
    select count(*)::bigint
    from (
      select tablename, cmd
      from pg_policies
      where schemaname = 'public'
        and tablename in ('courses', 'course_modules', 'lessons')
        and 'authenticated' = any(roles)
      group by tablename, cmd
      having count(*) > 1
    ) as duplicates
  ),
  0::bigint,
  'authenticated course-domain policies are unique per action'
);

select is(
  (
    select count(*)::bigint
    from (
      select tablename, cmd
      from pg_policies
      where schemaname = 'public'
        and tablename in ('courses', 'course_modules', 'lessons')
        and 'anon' = any(roles)
      group by tablename, cmd
      having count(*) > 1
    ) as duplicates
  ),
  0::bigint,
  'anonymous course-domain policies are unique per action'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename = 'courses'
      and policyname = 'courses_anon_read'
      and qual ilike '%visibility = ''public''%'
  ),
  1::bigint,
  'anonymous catalog reads require public visibility'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename = 'courses'
      and policyname = 'courses_authenticated_read'
      and qual ilike '%is_enrolled(id)%'
  ),
  1::bigint,
  'authenticated course reads retain enrollment access'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename = 'course_modules'
      and policyname = 'modules_authenticated_read'
      and qual ilike '%is_enrolled(course.id)%'
  ),
  1::bigint,
  'authenticated module reads retain enrollment access'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename = 'courses'
      and 'authenticated' = any(roles)
      and cmd in ('INSERT', 'UPDATE', 'DELETE')
  ),
  3::bigint,
  'courses retain one authenticated owner/staff policy per write action'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename = 'course_modules'
      and 'authenticated' = any(roles)
      and cmd in ('INSERT', 'UPDATE', 'DELETE')
  ),
  3::bigint,
  'course modules retain one authenticated owner/staff policy per write action'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and tablename = 'lessons'
      and 'authenticated' = any(roles)
      and cmd in ('INSERT', 'UPDATE', 'DELETE')
  ),
  3::bigint,
  'lessons retain one authenticated owner/staff policy per write action'
);

select * from finish();
rollback;
