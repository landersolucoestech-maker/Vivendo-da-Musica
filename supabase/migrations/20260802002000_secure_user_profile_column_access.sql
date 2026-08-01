revoke update on table public.user_profiles from anon, authenticated;
grant update (full_name, avatar_url) on table public.user_profiles to anon, authenticated;

create policy user_profiles_owner_read on public.user_profiles
for select to authenticated
using (user_id = (select auth.uid()));

create policy user_profiles_owner_update on public.user_profiles
for update to authenticated
using (user_id = (select auth.uid()) and is_demo = false)
with check (user_id = (select auth.uid()) and is_demo = false);
