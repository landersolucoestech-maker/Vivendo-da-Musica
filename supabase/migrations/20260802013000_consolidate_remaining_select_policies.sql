drop policy if exists dev_demo_courses_read on public.courses;
drop policy if exists courses_public_catalog_read on public.courses;
drop policy if exists courses_owner_staff_read on public.courses;

create policy courses_anon_read on public.courses
for select to anon
using (is_demo = true or (status = 'published' and visibility = 'public'));

create policy courses_authenticated_read on public.courses
for select to authenticated
using (
  (status = 'published' and visibility = 'public')
  or instructor_id = (select auth.uid())
  or public.is_platform_staff()
);

drop policy if exists dev_demo_modules_read on public.course_modules;
drop policy if exists modules_public_catalog_read on public.course_modules;

create policy modules_anon_read on public.course_modules
for select to anon
using (exists (
  select 1 from public.courses c
  where c.id = course_modules.course_id
    and (c.is_demo = true or (c.status = 'published' and c.visibility = 'public'))
));

create policy modules_authenticated_read on public.course_modules
for select to authenticated
using (exists (
  select 1 from public.courses c
  where c.id = course_modules.course_id
    and (
      (c.status = 'published' and c.visibility = 'public')
      or c.instructor_id = (select auth.uid())
      or public.is_platform_staff()
    )
));

drop policy if exists enrollments_owner_select on public.enrollments;
drop policy if exists enrollments_instructor_staff_read on public.enrollments;

create policy enrollments_authenticated_read on public.enrollments
for select to authenticated
using (
  user_id = (select auth.uid())
  or public.is_platform_staff()
  or exists (
    select 1 from public.courses c
    where c.id = enrollments.course_id
      and c.instructor_id = (select auth.uid())
  )
);

drop policy if exists user_profiles_owner_read on public.user_profiles;
drop policy if exists user_profiles_staff_read on public.user_profiles;

create policy user_profiles_authenticated_read on public.user_profiles
for select to authenticated
using (user_id = (select auth.uid()) or public.is_platform_staff());
