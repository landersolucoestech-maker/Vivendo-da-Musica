drop policy if exists lesson_materials_authenticated_delete on storage.objects;
create policy lesson_materials_authenticated_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'lesson-materials'
  and exists (
    select 1
    from public.courses c
    where c.id = ((storage.foldername(name))[1])::uuid
      and (c.instructor_id = (select auth.uid()) or public.is_platform_staff())
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
    from public.courses c
    where c.id = ((storage.foldername(name))[1])::uuid
      and c.is_demo = true
  )
);
