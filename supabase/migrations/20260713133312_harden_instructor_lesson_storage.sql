drop policy if exists "Course staff can upload lesson files" on storage.objects;
drop policy if exists "Course staff can update lesson files" on storage.objects;
drop policy if exists "Course staff can delete lesson files" on storage.objects;

create policy "Course owners upload lesson files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('lesson-samples', 'lesson-projects')
    and public.is_course_staff((substring(name from '^([0-9a-fA-F-]{36})/'))::uuid)
  );

create policy "Course owners update lesson files"
  on storage.objects for update to authenticated
  using (
    bucket_id in ('lesson-samples', 'lesson-projects')
    and public.is_course_staff((substring(name from '^([0-9a-fA-F-]{36})/'))::uuid)
  )
  with check (
    bucket_id in ('lesson-samples', 'lesson-projects')
    and public.is_course_staff((substring(name from '^([0-9a-fA-F-]{36})/'))::uuid)
  );

create policy "Course owners delete lesson files"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('lesson-samples', 'lesson-projects')
    and public.is_course_staff((substring(name from '^([0-9a-fA-F-]{36})/'))::uuid)
  );
