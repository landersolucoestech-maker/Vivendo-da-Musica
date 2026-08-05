-- Consolidate course-domain RLS policies so each role/action has one
-- authoritative permissive policy. This removes legacy overlap and fixes the
-- public visibility leak where any published course was readable regardless
-- of the visibility column.

-- Courses: canonical reads.
drop policy if exists "Course staff can view their course" on public.courses;
drop policy if exists "Enrolled students can view their course" on public.courses;
drop policy if exists "Published courses are publicly visible" on public.courses;
drop policy if exists courses_authenticated_read on public.courses;

create policy courses_authenticated_read
on public.courses
for select
to authenticated
using (
  (status = 'published' and visibility = 'public')
  or instructor_id = (select auth.uid())
  or public.is_platform_staff()
  or public.is_enrolled(id)
);

-- Courses: remove legacy write policies already superseded by the canonical
-- owner/staff policies.
drop policy if exists "Instructors create own courses" on public.courses;
drop policy if exists "Instructors update own courses" on public.courses;
drop policy if exists "Instructors delete own courses" on public.courses;

-- Course modules: authenticated read must retain enrolled-student access before
-- the legacy public policies are removed.
drop policy if exists "Course staff can view modules" on public.course_modules;
drop policy if exists "Enrolled students can view modules" on public.course_modules;
drop policy if exists modules_authenticated_read on public.course_modules;

create policy modules_authenticated_read
on public.course_modules
for select
to authenticated
using (
  exists (
    select 1
    from public.courses as course
    where course.id = course_modules.course_id
      and (
        (course.status = 'published' and course.visibility = 'public')
        or course.instructor_id = (select auth.uid())
        or public.is_platform_staff()
        or public.is_enrolled(course.id)
      )
  )
);

drop policy if exists "Instructors create modules in own courses" on public.course_modules;
drop policy if exists "Instructors update modules in own courses" on public.course_modules;
drop policy if exists "Instructors delete modules in own courses" on public.course_modules;

-- Lessons: the canonical authenticated read policy already includes active
-- enrollment, course ownership and platform staff.
drop policy if exists "Course staff can view lessons" on public.lessons;
drop policy if exists "Enrolled students can view lessons" on public.lessons;
drop policy if exists "Instructors create lessons in own courses" on public.lessons;
drop policy if exists "Instructors update lessons in own courses" on public.lessons;
drop policy if exists "Instructors delete lessons in own courses" on public.lessons;
