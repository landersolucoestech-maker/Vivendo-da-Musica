-- Public rows, owned private rows and staff review access share one SELECT
-- policy per table. This preserves access while avoiding multiple permissive
-- policies for the same roles and command.

drop policy if exists community_groups_owner_select on public.community_groups;
drop policy if exists community_groups_public_read on public.community_groups;
create policy community_groups_read
on public.community_groups
for select
to anon, authenticated
using (
  (visibility = 'public' and status = 'active')
  or owner_id = (select auth.uid())
  or public.is_platform_staff()
);

drop policy if exists community_posts_author_select on public.community_posts;
drop policy if exists community_posts_public_read on public.community_posts;
create policy community_posts_read
on public.community_posts
for select
to anon, authenticated
using (
  status = 'published'
  or author_id = (select auth.uid())
  or public.is_platform_staff()
);
