-- The hosted review policies retain public reads but must not remove an
-- identity's ability to read private groups it owns or hidden posts it wrote.
-- The review environment exercises JWT identities through both anon and
-- authenticated database roles, while auth.uid() remains the ownership gate.

drop policy if exists community_groups_owner_select on public.community_groups;
create policy community_groups_owner_select
on public.community_groups
for select
to anon, authenticated
using (
  owner_id = (select auth.uid())
  or public.is_platform_staff()
);

drop policy if exists community_posts_author_select on public.community_posts;
create policy community_posts_author_select
on public.community_posts
for select
to anon, authenticated
using (
  author_id = (select auth.uid())
  or public.is_platform_staff()
);
