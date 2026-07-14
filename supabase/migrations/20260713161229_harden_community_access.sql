-- Supabase projects may grant broad default privileges to API roles. Keep the
-- client surface intentionally narrow; RLS remains the row-level boundary.
revoke all on table
  public.community_groups,
  public.community_group_members,
  public.community_posts,
  public.community_comments,
  public.community_post_likes,
  public.community_reports,
  public.community_moderation_actions
from anon, authenticated;

grant select on table
  public.community_groups,
  public.community_posts,
  public.community_comments,
  public.community_post_likes
to anon;

grant select, insert, update, delete
  on table public.community_groups
  to authenticated;

grant select, insert, delete on table
  public.community_group_members,
  public.community_posts,
  public.community_comments,
  public.community_post_likes
to authenticated;

grant select, insert, update
  on table public.community_reports
  to authenticated;

grant select, insert
  on table public.community_moderation_actions
  to authenticated;

create index if not exists community_reports_resolved_by_idx
  on public.community_reports (resolved_by)
  where resolved_by is not null;

create index if not exists community_moderation_actions_report_id_idx
  on public.community_moderation_actions (report_id)
  where report_id is not null;
