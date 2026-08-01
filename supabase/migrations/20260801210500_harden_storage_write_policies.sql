update storage.buckets
set public = false
where id in ('lesson-projects', 'lesson-samples');

drop policy if exists "beat_storage_demo_insert" on storage.objects;
drop policy if exists "beat_storage_demo_update" on storage.objects;
drop policy if exists "beat_storage_demo_delete" on storage.objects;
drop policy if exists "seller_product_storage_demo_insert" on storage.objects;
drop policy if exists "seller_product_storage_demo_update" on storage.objects;
drop policy if exists "seller_product_storage_demo_delete" on storage.objects;

drop policy if exists "Allow authenticated users to upload lesson projects" on storage.objects;
drop policy if exists "Allow authenticated users to update lesson projects" on storage.objects;
drop policy if exists "Allow authenticated users to delete lesson projects" on storage.objects;
drop policy if exists "Allow authenticated users to upload lesson samples" on storage.objects;
drop policy if exists "Allow authenticated users to update lesson samples" on storage.objects;
drop policy if exists "Allow authenticated users to delete lesson samples" on storage.objects;

create policy "lesson_assets_owner_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id in ('lesson-projects', 'lesson-samples')
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.is_platform_staff()
  )
);

create policy "lesson_assets_owner_update"
on storage.objects for update to authenticated
using (
  bucket_id in ('lesson-projects', 'lesson-samples')
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.is_platform_staff()
  )
)
with check (
  bucket_id in ('lesson-projects', 'lesson-samples')
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.is_platform_staff()
  )
);

create policy "lesson_assets_owner_delete"
on storage.objects for delete to authenticated
using (
  bucket_id in ('lesson-projects', 'lesson-samples')
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.is_platform_staff()
  )
);
