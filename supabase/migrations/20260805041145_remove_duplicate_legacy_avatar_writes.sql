-- Owner-scoped avatar policies already enforce authenticated access and
-- validate the destination path on UPDATE. Remove older PUBLIC-role policies
-- that duplicate those writes. Public avatar reads remain unchanged.

drop policy if exists "Users can upload their own avatar"
on storage.objects;

drop policy if exists "Users can update their own avatar"
on storage.objects;

drop policy if exists "Users can delete their own avatar"
on storage.objects;
