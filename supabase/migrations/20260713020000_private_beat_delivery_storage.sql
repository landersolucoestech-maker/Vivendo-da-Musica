insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('beat-masters', 'beat-masters', false, 209715200, array['audio/mpeg','audio/wav','audio/x-wav','audio/flac','application/zip']::text[]),
  ('beat-stems', 'beat-stems', false, 1073741824, array['application/zip','application/x-zip-compressed']::text[])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Producers insert their beat masters" on storage.objects for insert to authenticated
with check (bucket_id = 'beat-masters' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Producers read their beat masters" on storage.objects for select to authenticated
using (bucket_id = 'beat-masters' and owner_id = (select auth.uid())::text);
create policy "Producers update their beat masters" on storage.objects for update to authenticated
using (bucket_id = 'beat-masters' and owner_id = (select auth.uid())::text)
with check (bucket_id = 'beat-masters' and (storage.foldername(name))[1] = (select auth.uid())::text and owner_id = (select auth.uid())::text);
create policy "Producers delete their beat masters" on storage.objects for delete to authenticated
using (bucket_id = 'beat-masters' and owner_id = (select auth.uid())::text);

create policy "Producers insert their beat stems" on storage.objects for insert to authenticated
with check (bucket_id = 'beat-stems' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Producers read their beat stems" on storage.objects for select to authenticated
using (bucket_id = 'beat-stems' and owner_id = (select auth.uid())::text);
create policy "Producers update their beat stems" on storage.objects for update to authenticated
using (bucket_id = 'beat-stems' and owner_id = (select auth.uid())::text)
with check (bucket_id = 'beat-stems' and (storage.foldername(name))[1] = (select auth.uid())::text and owner_id = (select auth.uid())::text);
create policy "Producers delete their beat stems" on storage.objects for delete to authenticated
using (bucket_id = 'beat-stems' and owner_id = (select auth.uid())::text);
