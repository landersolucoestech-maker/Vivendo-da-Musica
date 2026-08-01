grant execute on function public.is_platform_staff() to authenticated;

create policy courses_public_catalog_read on public.courses
for select to anon, authenticated
using (status = 'published' and visibility = 'public');

create policy courses_owner_staff_read on public.courses
for select to authenticated
using (instructor_id = (select auth.uid()) or public.is_platform_staff());

create policy courses_owner_staff_insert on public.courses
for insert to authenticated
with check (instructor_id = (select auth.uid()) or public.is_platform_staff());

create policy courses_owner_staff_update on public.courses
for update to authenticated
using (instructor_id = (select auth.uid()) or public.is_platform_staff())
with check (instructor_id = (select auth.uid()) or public.is_platform_staff());

create policy courses_owner_staff_delete on public.courses
for delete to authenticated
using (instructor_id = (select auth.uid()) or public.is_platform_staff());

create policy modules_public_catalog_read on public.course_modules
for select to anon, authenticated
using (exists (
  select 1 from public.courses c
  where c.id = course_modules.course_id
    and c.status = 'published'
    and c.visibility = 'public'
));

create policy modules_owner_staff_insert on public.course_modules
for insert to authenticated
with check (exists (
  select 1 from public.courses c
  where c.id = course_modules.course_id
    and (c.instructor_id = (select auth.uid()) or public.is_platform_staff())
));

create policy modules_owner_staff_update on public.course_modules
for update to authenticated
using (exists (
  select 1 from public.courses c
  where c.id = course_modules.course_id
    and (c.instructor_id = (select auth.uid()) or public.is_platform_staff())
))
with check (exists (
  select 1 from public.courses c
  where c.id = course_modules.course_id
    and (c.instructor_id = (select auth.uid()) or public.is_platform_staff())
));

create policy modules_owner_staff_delete on public.course_modules
for delete to authenticated
using (exists (
  select 1 from public.courses c
  where c.id = course_modules.course_id
    and (c.instructor_id = (select auth.uid()) or public.is_platform_staff())
));

create policy lessons_enrolled_owner_staff_read on public.lessons
for select to authenticated
using (exists (
  select 1
  from public.course_modules m
  join public.courses c on c.id = m.course_id
  where m.id = lessons.module_id
    and (
      c.instructor_id = (select auth.uid())
      or public.is_platform_staff()
      or exists (
        select 1 from public.enrollments e
        where e.course_id = c.id
          and e.user_id = (select auth.uid())
          and e.status = 'active'
      )
    )
));

create policy lessons_owner_staff_insert on public.lessons
for insert to authenticated
with check (exists (
  select 1 from public.course_modules m
  join public.courses c on c.id = m.course_id
  where m.id = lessons.module_id
    and (c.instructor_id = (select auth.uid()) or public.is_platform_staff())
));

create policy lessons_owner_staff_update on public.lessons
for update to authenticated
using (exists (
  select 1 from public.course_modules m
  join public.courses c on c.id = m.course_id
  where m.id = lessons.module_id
    and (c.instructor_id = (select auth.uid()) or public.is_platform_staff())
))
with check (exists (
  select 1 from public.course_modules m
  join public.courses c on c.id = m.course_id
  where m.id = lessons.module_id
    and (c.instructor_id = (select auth.uid()) or public.is_platform_staff())
));

create policy lessons_owner_staff_delete on public.lessons
for delete to authenticated
using (exists (
  select 1 from public.course_modules m
  join public.courses c on c.id = m.course_id
  where m.id = lessons.module_id
    and (c.instructor_id = (select auth.uid()) or public.is_platform_staff())
));

create policy materials_enrolled_owner_staff_read on public.lesson_materials
for select to authenticated
using (exists (
  select 1
  from public.lessons l
  join public.course_modules m on m.id = l.module_id
  join public.courses c on c.id = m.course_id
  where l.id = lesson_materials.lesson_id
    and (
      c.instructor_id = (select auth.uid())
      or public.is_platform_staff()
      or exists (
        select 1 from public.enrollments e
        where e.course_id = c.id
          and e.user_id = (select auth.uid())
          and e.status = 'active'
      )
    )
));

create policy materials_owner_staff_insert on public.lesson_materials
for insert to authenticated
with check (exists (
  select 1 from public.lessons l
  join public.course_modules m on m.id = l.module_id
  join public.courses c on c.id = m.course_id
  where l.id = lesson_materials.lesson_id
    and (c.instructor_id = (select auth.uid()) or public.is_platform_staff())
));

create policy materials_owner_staff_update on public.lesson_materials
for update to authenticated
using (exists (
  select 1 from public.lessons l
  join public.course_modules m on m.id = l.module_id
  join public.courses c on c.id = m.course_id
  where l.id = lesson_materials.lesson_id
    and (c.instructor_id = (select auth.uid()) or public.is_platform_staff())
))
with check (exists (
  select 1 from public.lessons l
  join public.course_modules m on m.id = l.module_id
  join public.courses c on c.id = m.course_id
  where l.id = lesson_materials.lesson_id
    and (c.instructor_id = (select auth.uid()) or public.is_platform_staff())
));

create policy materials_owner_staff_delete on public.lesson_materials
for delete to authenticated
using (exists (
  select 1 from public.lessons l
  join public.course_modules m on m.id = l.module_id
  join public.courses c on c.id = m.course_id
  where l.id = lesson_materials.lesson_id
    and (c.instructor_id = (select auth.uid()) or public.is_platform_staff())
));

create policy enrollments_instructor_staff_read on public.enrollments
for select to authenticated
using (
  public.is_platform_staff()
  or exists (
    select 1 from public.courses c
    where c.id = enrollments.course_id
      and c.instructor_id = (select auth.uid())
  )
);

create policy enrollments_staff_insert on public.enrollments
for insert to authenticated
with check (public.is_platform_staff());

create policy enrollments_staff_update on public.enrollments
for update to authenticated
using (public.is_platform_staff())
with check (public.is_platform_staff());

create policy enrollments_staff_delete on public.enrollments
for delete to authenticated
using (public.is_platform_staff());
