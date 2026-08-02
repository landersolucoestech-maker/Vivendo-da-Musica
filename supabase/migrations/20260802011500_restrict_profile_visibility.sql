drop policy if exists dev_profiles_read on public.user_profiles;

create policy dev_profiles_read on public.user_profiles
for select to anon
using (is_demo = true);

create policy user_profiles_staff_read on public.user_profiles
for select to authenticated
using (public.is_platform_staff());
