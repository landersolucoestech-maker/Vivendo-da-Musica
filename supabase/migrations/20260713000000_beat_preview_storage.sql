-- Public, watermarked beat previews. Commercial masters and stems must never
-- be stored in this bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'beat-previews',
  'beat-previews',
  true,
  20971520,
  array['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/x-wav']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Public can listen to beat previews"
on storage.objects for select
to public
using (bucket_id = 'beat-previews');

create policy "Producers upload previews in their folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'beat-previews'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Producers update previews in their folder"
on storage.objects for update
to authenticated
using (
  bucket_id = 'beat-previews'
  and owner_id = (select auth.uid())::text
)
with check (
  bucket_id = 'beat-previews'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and owner_id = (select auth.uid())::text
);

create policy "Producers delete previews in their folder"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'beat-previews'
  and owner_id = (select auth.uid())::text
);
