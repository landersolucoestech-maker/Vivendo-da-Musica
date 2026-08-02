-- The hosted review policies retain public reads but must not remove the
-- authenticated owner's ability to read private groups or hidden own posts.

drop policy if exists community_groups_owner_select on public.community_groups;
create policy community_groups_owner_select
on public.community_groups
for select
to authenticated
using (
  owner_id = (select auth.uid())
  or public.is_platform_staff()
);

drop policy if exists community_posts_author_select on public.community_posts;
create policy community_posts_author_select
on public.community_posts
for select
to authenticated
using (
  author_id = (select auth.uid())
  or public.is_platform_staff()
);
