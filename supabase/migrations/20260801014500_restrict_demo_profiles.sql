drop policy if exists dev_full_access_user_profiles on public.user_profiles;
create policy dev_profiles_read on public.user_profiles for select to anon using (role in ('student','instructor','producer','affiliate','admin'));
create policy dev_profiles_update on public.user_profiles for update to anon using (role in ('student','instructor','producer','affiliate','admin')) with check (role in ('student','instructor','producer','affiliate','admin'));
