-- Public lesson asset buckets serve known object URLs directly. Remove legacy
-- storage.objects SELECT policies so anonymous clients cannot enumerate every
-- project or sample through the Data API.

drop policy if exists "Lesson projects are publicly accessible"
on storage.objects;

drop policy if exists "Lesson samples are publicly accessible"
on storage.objects;
