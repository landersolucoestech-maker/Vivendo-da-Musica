create index if not exists community_comments_author_id_idx on public.community_comments(author_id);
create index if not exists community_comments_post_id_idx on public.community_comments(post_id);
create index if not exists community_group_members_user_id_idx on public.community_group_members(user_id);
create index if not exists community_groups_owner_id_idx on public.community_groups(owner_id);
create index if not exists community_post_likes_user_id_idx on public.community_post_likes(user_id);
create index if not exists community_posts_author_id_idx on public.community_posts(author_id);
create index if not exists community_posts_group_id_idx on public.community_posts(group_id);
create index if not exists course_certificates_course_id_idx on public.course_certificates(course_id);
create index if not exists course_certificates_user_id_idx on public.course_certificates(user_id);
create index if not exists opportunity_applications_applicant_id_idx on public.opportunity_applications(applicant_id);
create index if not exists opportunity_favorites_user_id_idx on public.opportunity_favorites(user_id);
create index if not exists student_favorites_beat_id_idx on public.student_favorites(beat_id) where beat_id is not null;
create index if not exists student_favorites_content_id_idx on public.student_favorites(content_id) where content_id is not null;
create index if not exists student_favorites_course_id_idx on public.student_favorites(course_id) where course_id is not null;
create index if not exists student_notifications_user_id_idx on public.student_notifications(user_id);
create index if not exists support_tickets_user_id_idx on public.support_tickets(user_id);

drop policy if exists community_groups_demo_write on public.community_groups;
create policy community_groups_demo_insert on public.community_groups
for insert to anon
with check (owner_id in (
  '11111111-1111-4111-8111-111111111111'::uuid,
  '22222222-2222-4222-8222-222222222222'::uuid,
  'c3942032-967a-4cde-b00c-22446584e699'::uuid
));
create policy community_groups_demo_update on public.community_groups
for update to anon
using (is_demo or owner_id in (
  '11111111-1111-4111-8111-111111111111'::uuid,
  '22222222-2222-4222-8222-222222222222'::uuid,
  'c3942032-967a-4cde-b00c-22446584e699'::uuid
))
with check (owner_id in (
  '11111111-1111-4111-8111-111111111111'::uuid,
  '22222222-2222-4222-8222-222222222222'::uuid,
  'c3942032-967a-4cde-b00c-22446584e699'::uuid
));
create policy community_groups_demo_delete on public.community_groups
for delete to anon
using (is_demo or owner_id in (
  '11111111-1111-4111-8111-111111111111'::uuid,
  '22222222-2222-4222-8222-222222222222'::uuid,
  'c3942032-967a-4cde-b00c-22446584e699'::uuid
));

drop policy if exists community_posts_demo_write on public.community_posts;
create policy community_posts_demo_insert on public.community_posts
for insert to anon
with check (author_id in (
  '11111111-1111-4111-8111-111111111111'::uuid,
  '22222222-2222-4222-8222-222222222222'::uuid,
  'c3942032-967a-4cde-b00c-22446584e699'::uuid
));
create policy community_posts_demo_update on public.community_posts
for update to anon
using (is_demo or author_id in (
  '11111111-1111-4111-8111-111111111111'::uuid,
  '22222222-2222-4222-8222-222222222222'::uuid,
  'c3942032-967a-4cde-b00c-22446584e699'::uuid
))
with check (author_id in (
  '11111111-1111-4111-8111-111111111111'::uuid,
  '22222222-2222-4222-8222-222222222222'::uuid,
  'c3942032-967a-4cde-b00c-22446584e699'::uuid
));
create policy community_posts_demo_delete on public.community_posts
for delete to anon
using (is_demo or author_id in (
  '11111111-1111-4111-8111-111111111111'::uuid,
  '22222222-2222-4222-8222-222222222222'::uuid,
  'c3942032-967a-4cde-b00c-22446584e699'::uuid
));

drop policy if exists community_comments_demo_write on public.community_comments;
create policy community_comments_demo_insert on public.community_comments
for insert to anon
with check (author_id in (
  '11111111-1111-4111-8111-111111111111'::uuid,
  '22222222-2222-4222-8222-222222222222'::uuid,
  'c3942032-967a-4cde-b00c-22446584e699'::uuid
));
create policy community_comments_demo_update on public.community_comments
for update to anon
using (is_demo or author_id in (
  '11111111-1111-4111-8111-111111111111'::uuid,
  '22222222-2222-4222-8222-222222222222'::uuid,
  'c3942032-967a-4cde-b00c-22446584e699'::uuid
))
with check (author_id in (
  '11111111-1111-4111-8111-111111111111'::uuid,
  '22222222-2222-4222-8222-222222222222'::uuid,
  'c3942032-967a-4cde-b00c-22446584e699'::uuid
));
create policy community_comments_demo_delete on public.community_comments
for delete to anon
using (is_demo or author_id in (
  '11111111-1111-4111-8111-111111111111'::uuid,
  '22222222-2222-4222-8222-222222222222'::uuid,
  'c3942032-967a-4cde-b00c-22446584e699'::uuid
));
