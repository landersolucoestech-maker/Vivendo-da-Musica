insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lesson-materials',
  'lesson-materials',
  false,
  524288000,
  array[
    'application/pdf',
    'audio/wav',
    'audio/x-wav',
    'audio/mpeg',
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists lesson_materials_authenticated_read on storage.objects;
create policy lesson_materials_authenticated_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'lesson-materials'
  and exists (
    select 1
    from public.lessons l
    join public.course_modules m on m.id = l.module_id
    join public.courses c on c.id = m.course_id
    where c.id = ((storage.foldername(name))[1])::uuid
      and l.id = ((storage.foldername(name))[2])::uuid
      and (
        c.instructor_id = (select auth.uid())
        or public.is_platform_staff()
        or exists (
          select 1
          from public.enrollments e
          where e.course_id = c.id
            and e.user_id = (select auth.uid())
            and e.status = 'active'
        )
      )
  )
);

drop policy if exists lesson_materials_authenticated_insert on storage.objects;
create policy lesson_materials_authenticated_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'lesson-materials'
  and exists (
    select 1
    from public.lessons l
    join public.course_modules m on m.id = l.module_id
    join public.courses c on c.id = m.course_id
    where c.id = ((storage.foldername(name))[1])::uuid
      and l.id = ((storage.foldername(name))[2])::uuid
      and (c.instructor_id = (select auth.uid()) or public.is_platform_staff())
  )
);

drop policy if exists lesson_materials_authenticated_update on storage.objects;
create policy lesson_materials_authenticated_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'lesson-materials'
  and exists (
    select 1
    from public.lessons l
    join public.course_modules m on m.id = l.module_id
    join public.courses c on c.id = m.course_id
    where c.id = ((storage.foldername(name))[1])::uuid
      and l.id = ((storage.foldername(name))[2])::uuid
      and (c.instructor_id = (select auth.uid()) or public.is_platform_staff())
  )
)
with check (
  bucket_id = 'lesson-materials'
  and exists (
    select 1
    from public.lessons l
    join public.course_modules m on m.id = l.module_id
    join public.courses c on c.id = m.course_id
    where c.id = ((storage.foldername(name))[1])::uuid
      and l.id = ((storage.foldername(name))[2])::uuid
      and (c.instructor_id = (select auth.uid()) or public.is_platform_staff())
  )
);

drop policy if exists lesson_materials_authenticated_delete on storage.objects;
create policy lesson_materials_authenticated_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'lesson-materials'
  and exists (
    select 1
    from public.lessons l
    join public.course_modules m on m.id = l.module_id
    join public.courses c on c.id = m.course_id
    where c.id = ((storage.foldername(name))[1])::uuid
      and l.id = ((storage.foldername(name))[2])::uuid
      and (c.instructor_id = (select auth.uid()) or public.is_platform_staff())
  )
);

drop policy if exists lesson_materials_demo_read on storage.objects;
create policy lesson_materials_demo_read
on storage.objects
for select
to anon
using (
  bucket_id = 'lesson-materials'
  and exists (
    select 1
    from public.lessons l
    join public.course_modules m on m.id = l.module_id
    join public.courses c on c.id = m.course_id
    where c.id = ((storage.foldername(name))[1])::uuid
      and l.id = ((storage.foldername(name))[2])::uuid
      and c.is_demo = true
  )
);

drop policy if exists lesson_materials_demo_insert on storage.objects;
create policy lesson_materials_demo_insert
on storage.objects
for insert
to anon
with check (
  bucket_id = 'lesson-materials'
  and exists (
    select 1
    from public.lessons l
    join public.course_modules m on m.id = l.module_id
    join public.courses c on c.id = m.course_id
    where c.id = ((storage.foldername(name))[1])::uuid
      and l.id = ((storage.foldername(name))[2])::uuid
      and c.is_demo = true
  )
);

drop policy if exists lesson_materials_demo_delete on storage.objects;
create policy lesson_materials_demo_delete
on storage.objects
for delete
to anon
using (
  bucket_id = 'lesson-materials'
  and exists (
    select 1
    from public.lessons l
    join public.course_modules m on m.id = l.module_id
    join public.courses c on c.id = m.course_id
    where c.id = ((storage.foldername(name))[1])::uuid
      and l.id = ((storage.foldername(name))[2])::uuid
      and c.is_demo = true
  )
);
