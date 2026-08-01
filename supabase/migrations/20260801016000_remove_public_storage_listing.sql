drop policy if exists avatars_public_read on storage.objects;
drop policy if exists "Allow public read access to lesson projects" on storage.objects;
drop policy if exists "Allow public read access to lesson samples" on storage.objects;
revoke execute on function public.is_platform_staff() from public, anon, authenticated;
