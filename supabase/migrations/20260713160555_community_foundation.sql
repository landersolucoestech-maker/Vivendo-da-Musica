create type public.community_group_visibility as enum ('public', 'private');
create type public.community_group_status as enum ('active', 'archived');
create type public.community_member_role as enum ('member', 'moderator', 'owner');
create type public.community_member_status as enum ('active', 'pending', 'banned');
create type public.community_content_status as enum ('published', 'hidden', 'removed');
create type public.community_report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

create table public.community_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(btrim(name)) between 3 and 100),
  description text not null check (char_length(btrim(description)) between 10 and 1000),
  visibility public.community_group_visibility not null default 'public',
  status public.community_group_status not null default 'active',
  member_count integer not null default 1 check (member_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.community_group_members (
  group_id uuid not null references public.community_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_role public.community_member_role not null default 'member',
  status public.community_member_status not null default 'active',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid references public.community_groups(id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 5000),
  status public.community_content_status not null default 'published',
  like_count integer not null default 0 check (like_count >= 0),
  comment_count integer not null default 0 check (comment_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.community_comments(id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 2000),
  status public.community_content_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.community_post_likes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.community_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment', 'group', 'user')),
  target_id uuid not null,
  reason text not null check (reason in ('spam', 'harassment', 'hate', 'copyright', 'misinformation', 'other')),
  details text check (details is null or char_length(btrim(details)) between 5 and 2000),
  status public.community_report_status not null default 'open',
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);

create table public.community_moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid not null references auth.users(id) on delete restrict,
  report_id uuid references public.community_reports(id) on delete set null,
  target_type text not null check (target_type in ('post', 'comment', 'group', 'user')),
  target_id uuid not null,
  action text not null check (action in ('hide', 'remove', 'restore', 'warn', 'ban', 'unban', 'dismiss')),
  reason text not null check (char_length(btrim(reason)) between 5 and 2000),
  created_at timestamptz not null default now()
);

create index community_groups_owner_idx on public.community_groups (owner_id);
create index community_groups_public_idx on public.community_groups (status, visibility, created_at desc);
create index community_group_members_user_idx on public.community_group_members (user_id, status);
create index community_posts_feed_idx on public.community_posts (status, created_at desc);
create index community_posts_group_idx on public.community_posts (group_id, status, created_at desc);
create index community_posts_author_idx on public.community_posts (author_id, created_at desc);
create index community_comments_post_idx on public.community_comments (post_id, status, created_at);
create index community_comments_author_idx on public.community_comments (author_id);
create index community_comments_parent_idx on public.community_comments (parent_id) where parent_id is not null;
create index community_post_likes_user_idx on public.community_post_likes (user_id, created_at desc);
create index community_reports_status_idx on public.community_reports (status, created_at desc);
create index community_reports_target_idx on public.community_reports (target_type, target_id);
create index community_moderation_actions_target_idx on public.community_moderation_actions (target_type, target_id, created_at desc);
create index community_moderation_actions_moderator_idx on public.community_moderation_actions (moderator_id, created_at desc);

alter table public.community_groups enable row level security;
alter table public.community_group_members enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_post_likes enable row level security;
alter table public.community_reports enable row level security;
alter table public.community_moderation_actions enable row level security;

create policy "Public reads active public groups" on public.community_groups for select
using ((status = 'active' and visibility = 'public') or owner_id = (select auth.uid()) or public.is_staff());
create policy "Users create owned groups" on public.community_groups for insert to authenticated
with check (owner_id = (select auth.uid()));
create policy "Owners update groups" on public.community_groups for update to authenticated
using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Owners delete groups" on public.community_groups for delete to authenticated using (owner_id = (select auth.uid()));

create policy "Users read own group memberships" on public.community_group_members for select to authenticated
using (user_id = (select auth.uid()) or exists (select 1 from public.community_groups g where g.id = group_id and g.owner_id = (select auth.uid())) or public.is_staff());
create policy "Users join public groups" on public.community_group_members for insert to authenticated
with check (user_id = (select auth.uid()) and member_role = 'member' and status = 'active' and exists (select 1 from public.community_groups g where g.id = group_id and g.status = 'active' and g.visibility = 'public'));
create policy "Users leave groups" on public.community_group_members for delete to authenticated
using (user_id = (select auth.uid()) and member_role <> 'owner');

create policy "Public reads published community posts" on public.community_posts for select
using ((status = 'published' and (group_id is null or exists (select 1 from public.community_groups g where g.id = group_id and g.status = 'active' and g.visibility = 'public'))) or author_id = (select auth.uid()) or public.is_staff());
create policy "Authenticated users create posts" on public.community_posts for insert to authenticated
with check (author_id = (select auth.uid()) and status = 'published' and (group_id is null or exists (select 1 from public.community_group_members m where m.group_id = community_posts.group_id and m.user_id = (select auth.uid()) and m.status = 'active')));
create policy "Authors delete own posts" on public.community_posts for delete to authenticated using (author_id = (select auth.uid()) or public.is_staff());

create policy "Public reads published comments" on public.community_comments for select
using ((status = 'published' and exists (select 1 from public.community_posts p where p.id = post_id and p.status = 'published')) or author_id = (select auth.uid()) or public.is_staff());
create policy "Authenticated users create comments" on public.community_comments for insert to authenticated
with check (author_id = (select auth.uid()) and status = 'published' and exists (select 1 from public.community_posts p where p.id = post_id and p.status = 'published'));
create policy "Authors delete own comments" on public.community_comments for delete to authenticated using (author_id = (select auth.uid()) or public.is_staff());

create policy "Public reads post likes" on public.community_post_likes for select
using (exists (select 1 from public.community_posts p where p.id = post_id and p.status = 'published'));
create policy "Users like as themselves" on public.community_post_likes for insert to authenticated
with check (user_id = (select auth.uid()) and exists (select 1 from public.community_posts p where p.id = post_id and p.status = 'published'));
create policy "Users remove own likes" on public.community_post_likes for delete to authenticated using (user_id = (select auth.uid()));

create policy "Reporters and staff read reports" on public.community_reports for select to authenticated
using (reporter_id = (select auth.uid()) or public.is_staff());
create policy "Users create reports" on public.community_reports for insert to authenticated
with check (reporter_id = (select auth.uid()) and status = 'open' and resolved_by is null and resolved_at is null);
create policy "Staff update reports" on public.community_reports for update to authenticated
using (public.is_staff()) with check (public.is_staff());
create policy "Staff read moderation actions" on public.community_moderation_actions for select to authenticated using (public.is_staff());
create policy "Staff create moderation actions" on public.community_moderation_actions for insert to authenticated
with check (moderator_id = (select auth.uid()) and public.is_staff());

create trigger update_community_groups_updated_at before update on public.community_groups for each row execute function public.update_updated_at_column();
create trigger update_community_posts_updated_at before update on public.community_posts for each row execute function public.update_updated_at_column();
create trigger update_community_comments_updated_at before update on public.community_comments for each row execute function public.update_updated_at_column();

create or replace function public.sync_community_post_counters()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'community_post_likes' then
    update public.community_posts set like_count = (select count(*) from public.community_post_likes where post_id = coalesce(new.post_id, old.post_id)) where id = coalesce(new.post_id, old.post_id);
  else
    update public.community_posts set comment_count = (select count(*) from public.community_comments where post_id = coalesce(new.post_id, old.post_id) and status = 'published') where id = coalesce(new.post_id, old.post_id);
  end if;
  return coalesce(new, old);
end;
$$;
revoke all on function public.sync_community_post_counters() from public;
create trigger sync_community_post_like_count after insert or delete on public.community_post_likes for each row execute function public.sync_community_post_counters();
create trigger sync_community_post_comment_count after insert or update of status or delete on public.community_comments for each row execute function public.sync_community_post_counters();

create or replace function public.sync_community_group_member_count()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.community_groups set member_count = (select count(*) from public.community_group_members where group_id = coalesce(new.group_id, old.group_id) and status = 'active') where id = coalesce(new.group_id, old.group_id);
  return coalesce(new, old);
end;
$$;
revoke all on function public.sync_community_group_member_count() from public;
create trigger sync_community_group_member_count after insert or update of status or delete on public.community_group_members for each row execute function public.sync_community_group_member_count();

create or replace function public.add_community_group_owner_membership()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.community_group_members (group_id, user_id, member_role, status) values (new.id, new.owner_id, 'owner', 'active');
  return new;
end;
$$;
revoke all on function public.add_community_group_owner_membership() from public;
create trigger add_community_group_owner_membership after insert on public.community_groups for each row execute function public.add_community_group_owner_membership();

grant select on public.community_groups, public.community_posts, public.community_comments, public.community_post_likes to anon;
grant select, insert, update, delete on public.community_groups, public.community_group_members, public.community_posts, public.community_comments, public.community_post_likes to authenticated;
grant select, insert, update on public.community_reports to authenticated;
grant select, insert on public.community_moderation_actions to authenticated;
