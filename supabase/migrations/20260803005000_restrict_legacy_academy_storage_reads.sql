-- Public catalog imagery remains readable, but course videos and downloadable
-- materials must not be exposed through the anonymous Storage API. The active
-- learning flow uses lesson-specific private buckets and signed URLs.

drop policy if exists academy_storage_public_read on storage.objects;
drop policy if exists academy_images_public_read on storage.objects;
create policy academy_images_public_read
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'academy-images');

drop policy if exists academy_delivery_staff_read on storage.objects;
create policy academy_delivery_staff_read
on storage.objects
for select
to authenticated
using (
  bucket_id in ('academy-videos', 'academy-materials')
  and public.is_platform_staff()
);
