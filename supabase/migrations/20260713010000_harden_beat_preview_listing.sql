-- Public buckets serve objects through their public URL without a SELECT
-- policy. Removing it prevents clients from listing every preview object.
drop policy if exists "Public can listen to beat previews" on storage.objects;
