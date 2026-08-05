-- Consolidate identity, enrollment and lesson-progress policies. Preserve the
-- existing DEV preview behavior while removing overlapping permissive paths.

-- user_profiles has no INSERT grant for anon/authenticated, so the legacy
-- insert policy was ineffective and is removed rather than duplicated.
drop policy if exists "Users can insert their own profile" on public.user_profiles;
drop policy if exists "Staff can view all profiles" on public.user_profiles;
drop policy if exists "Users can view their own profile" on public.user_profiles;
drop policy if exists "Users can update their own profile (role excluded)" on public.user_profiles;

drop policy if exists user_profiles_owner_update on public.user_profiles;
create policy user_profiles_owner_update
on public.user_profiles
for update
to authenticated
using (
  user_id = (select auth.uid())
  and is_demo = false
)
with check (
  user_id = (select auth.uid())
  and is_demo = false
  and role = public.current_role()
);

-- Enrollment reads are already covered by one authenticated policy for the
-- student, platform staff and course owner. Replace legacy public write paths
-- with canonical authenticated course-staff policies.
drop policy if exists "Course staff can grant enrollments for their course" on public.enrollments;
drop policy if exists "Course staff can view enrollments for their course" on public.enrollments;
drop policy if exists "Users can view their own enrollments" on public.enrollments;
drop policy if exists "Course staff can update enrollments for their course" on public.enrollments;

drop policy if exists enrollments_staff_insert on public.enrollments;
create policy enrollments_course_staff_insert
on public.enrollments
for insert
to authenticated
with check (public.is_course_staff(course_id));

drop policy if exists enrollments_staff_update on public.enrollments;
create policy enrollments_course_staff_update
on public.enrollments
for update
to authenticated
using (public.is_course_staff(course_id))
with check (public.is_course_staff(course_id));

-- Consolidate authenticated lesson progress policies.
drop policy if exists "Users can insert their own progress" on public.lesson_progress;
drop policy if exists "Users can view their own progress" on public.lesson_progress;
drop policy if exists "Users can update their own progress" on public.lesson_progress;
drop policy if exists "Course staff view student progress" on public.lesson_progress;
drop policy if exists lesson_progress_owner_insert on public.lesson_progress;
drop policy if exists lesson_progress_owner_select on public.lesson_progress;
drop policy if exists lesson_progress_owner_update on public.lesson_progress;

create policy lesson_progress_authenticated_insert
on public.lesson_progress
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy lesson_progress_authenticated_select
on public.lesson_progress
for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.lessons as lesson
    join public.course_modules as module on module.id = lesson.module_id
    where lesson.id = lesson_progress.lesson_id
      and public.is_course_staff(module.course_id)
  )
);

create policy lesson_progress_authenticated_update
on public.lesson_progress
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Anonymous preview progress must belong both to a demo student and to a
-- lesson inside a demo course. The previous policy checked only the student.
drop policy if exists dev_student_progress_insert on public.lesson_progress;
drop policy if exists dev_student_progress_read on public.lesson_progress;
drop policy if exists dev_student_progress_update on public.lesson_progress;

create policy dev_student_progress_insert
on public.lesson_progress
for insert
to anon
with check (
  exists (
    select 1
    from public.user_profiles as profile
    where profile.user_id = lesson_progress.user_id
      and profile.role = 'student'
      and profile.is_demo = true
  )
  and exists (
    select 1
    from public.lessons as lesson
    join public.course_modules as module on module.id = lesson.module_id
    join public.courses as course on course.id = module.course_id
    where lesson.id = lesson_progress.lesson_id
      and course.is_demo = true
  )
);

create policy dev_student_progress_read
on public.lesson_progress
for select
to anon
using (
  exists (
    select 1
    from public.user_profiles as profile
    where profile.user_id = lesson_progress.user_id
      and profile.role = 'student'
      and profile.is_demo = true
  )
  and exists (
    select 1
    from public.lessons as lesson
    join public.course_modules as module on module.id = lesson.module_id
    join public.courses as course on course.id = module.course_id
    where lesson.id = lesson_progress.lesson_id
      and course.is_demo = true
  )
);

create policy dev_student_progress_update
on public.lesson_progress
for update
to anon
using (
  exists (
    select 1
    from public.user_profiles as profile
    where profile.user_id = lesson_progress.user_id
      and profile.role = 'student'
      and profile.is_demo = true
  )
  and exists (
    select 1
    from public.lessons as lesson
    join public.course_modules as module on module.id = lesson.module_id
    join public.courses as course on course.id = module.course_id
    where lesson.id = lesson_progress.lesson_id
      and course.is_demo = true
  )
)
with check (
  exists (
    select 1
    from public.user_profiles as profile
    where profile.user_id = lesson_progress.user_id
      and profile.role = 'student'
      and profile.is_demo = true
  )
  and exists (
    select 1
    from public.lessons as lesson
    join public.course_modules as module on module.id = lesson.module_id
    join public.courses as course on course.id = module.course_id
    where lesson.id = lesson_progress.lesson_id
      and course.is_demo = true
  )
);
