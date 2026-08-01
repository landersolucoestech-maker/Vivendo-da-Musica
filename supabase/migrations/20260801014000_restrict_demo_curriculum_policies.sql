alter table public.courses add column if not exists is_demo boolean not null default true;
update public.courses set is_demo=true where is_demo is distinct from true;

drop policy if exists dev_full_access_courses on public.courses;
drop policy if exists dev_full_access_course_modules on public.course_modules;
drop policy if exists dev_full_access_lessons on public.lessons;
drop policy if exists dev_full_access_lesson_materials on public.lesson_materials;

create policy dev_demo_courses_read on public.courses for select to anon using (is_demo);
create policy dev_demo_courses_insert on public.courses for insert to anon with check (is_demo);
create policy dev_demo_courses_update on public.courses for update to anon using (is_demo) with check (is_demo);
create policy dev_demo_courses_delete on public.courses for delete to anon using (is_demo);

create policy dev_demo_modules_read on public.course_modules for select to anon using (exists(select 1 from public.courses c where c.id=course_id and c.is_demo));
create policy dev_demo_modules_insert on public.course_modules for insert to anon with check (exists(select 1 from public.courses c where c.id=course_id and c.is_demo));
create policy dev_demo_modules_update on public.course_modules for update to anon using (exists(select 1 from public.courses c where c.id=course_id and c.is_demo)) with check (exists(select 1 from public.courses c where c.id=course_id and c.is_demo));
create policy dev_demo_modules_delete on public.course_modules for delete to anon using (exists(select 1 from public.courses c where c.id=course_id and c.is_demo));

create policy dev_demo_lessons_read on public.lessons for select to anon using (exists(select 1 from public.course_modules m join public.courses c on c.id=m.course_id where m.id=module_id and c.is_demo));
create policy dev_demo_lessons_insert on public.lessons for insert to anon with check (exists(select 1 from public.course_modules m join public.courses c on c.id=m.course_id where m.id=module_id and c.is_demo));
create policy dev_demo_lessons_update on public.lessons for update to anon using (exists(select 1 from public.course_modules m join public.courses c on c.id=m.course_id where m.id=module_id and c.is_demo)) with check (exists(select 1 from public.course_modules m join public.courses c on c.id=m.course_id where m.id=module_id and c.is_demo));
create policy dev_demo_lessons_delete on public.lessons for delete to anon using (exists(select 1 from public.course_modules m join public.courses c on c.id=m.course_id where m.id=module_id and c.is_demo));

create policy dev_demo_materials_read on public.lesson_materials for select to anon using (exists(select 1 from public.lessons l join public.course_modules m on m.id=l.module_id join public.courses c on c.id=m.course_id where l.id=lesson_id and c.is_demo));
create policy dev_demo_materials_insert on public.lesson_materials for insert to anon with check (exists(select 1 from public.lessons l join public.course_modules m on m.id=l.module_id join public.courses c on c.id=m.course_id where l.id=lesson_id and c.is_demo));
create policy dev_demo_materials_update on public.lesson_materials for update to anon using (exists(select 1 from public.lessons l join public.course_modules m on m.id=l.module_id join public.courses c on c.id=m.course_id where l.id=lesson_id and c.is_demo)) with check (exists(select 1 from public.lessons l join public.course_modules m on m.id=l.module_id join public.courses c on c.id=m.course_id where l.id=lesson_id and c.is_demo));
create policy dev_demo_materials_delete on public.lesson_materials for delete to anon using (exists(select 1 from public.lessons l join public.course_modules m on m.id=l.module_id join public.courses c on c.id=m.course_id where l.id=lesson_id and c.is_demo));
