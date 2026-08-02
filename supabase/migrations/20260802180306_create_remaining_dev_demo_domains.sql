-- Development-only domains used by the hosted review environment.
-- The policies below are restricted to synthetic identities seeded for dev.

create table if not exists public.student_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  title text not null,
  body text not null,
  category text not null check (category in ('course','order','community','system')),
  action_url text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_preferences (
  user_id uuid primary key references public.user_profiles(user_id) on delete cascade,
  course_updates boolean not null default true,
  community_activity boolean not null default true,
  marketing_emails boolean not null default false,
  public_profile boolean not null default true,
  show_progress boolean not null default false,
  locale text not null default 'pt-BR',
  theme text not null default 'system' check (theme in ('system','light','dark')),
  subscription_plan text not null default 'free' check (subscription_plan in ('free','premium','enterprise')),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  beat_id uuid references public.beats(id) on delete cascade,
  content_id uuid references public.academy_contents(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (num_nonnulls(course_id, beat_id, content_id) = 1)
);
create unique index if not exists student_favorites_course_unique on public.student_favorites(user_id,course_id) where course_id is not null;
create unique index if not exists student_favorites_beat_unique on public.student_favorites(user_id,beat_id) where beat_id is not null;
create unique index if not exists student_favorites_content_unique on public.student_favorites(user_id,content_id) where content_id is not null;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_code text not null unique default ('VDM-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open','in_progress','resolved')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_faq (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.course_certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  certificate_code text not null unique,
  student_name_snapshot text not null,
  course_title_snapshot text not null,
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.community_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.user_profiles(user_id) on delete cascade,
  slug text not null unique,
  name text not null,
  description text not null,
  visibility text not null default 'public' check (visibility in ('public','private')),
  status text not null default 'active' check (status in ('active','archived')),
  member_count integer not null default 1,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.community_groups(id) on delete cascade,
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  member_role text not null default 'member' check (member_role in ('owner','moderator','member')),
  joined_at timestamptz not null default now(),
  unique(group_id,user_id)
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.community_groups(id) on delete set null,
  author_id uuid not null references public.user_profiles(user_id) on delete cascade,
  author_name_snapshot text not null default 'Membro',
  author_role_snapshot text not null default 'student',
  content text not null,
  status text not null default 'published' check (status in ('published','hidden','removed')),
  like_count integer not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references public.user_profiles(user_id) on delete cascade,
  author_name_snapshot text not null default 'Membro',
  content text not null,
  status text not null default 'published' check (status in ('published','hidden','removed')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_post_likes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(post_id,user_id)
);

create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.user_profiles(user_id) on delete cascade,
  target_type text not null check (target_type in ('post','comment','group')),
  target_id uuid not null,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  unique(reporter_id,target_type,target_id)
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  title text not null,
  organization_name text not null,
  location text not null,
  engagement_type text not null,
  status text not null default 'open' check (status in ('open','closed')),
  description text not null,
  application_count integer not null default 0,
  published_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.opportunity_favorites (
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(opportunity_id,user_id)
);

create table if not exists public.opportunity_applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  applicant_id uuid not null references public.user_profiles(user_id) on delete cascade,
  cover_letter text not null,
  portfolio_url text,
  status text not null default 'submitted' check (status in ('submitted','reviewing','approved','rejected','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(opportunity_id,applicant_id)
);

alter table public.student_notifications enable row level security;
alter table public.student_preferences enable row level security;
alter table public.student_favorites enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_faq enable row level security;
alter table public.course_certificates enable row level security;
alter table public.community_groups enable row level security;
alter table public.community_group_members enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_post_likes enable row level security;
alter table public.community_reports enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_favorites enable row level security;
alter table public.opportunity_applications enable row level security;

create policy student_notifications_demo_all on public.student_notifications for all to anon
using (user_id='11111111-1111-4111-8111-111111111111'::uuid)
with check (user_id='11111111-1111-4111-8111-111111111111'::uuid);
create policy student_preferences_demo_all on public.student_preferences for all to anon
using (user_id='11111111-1111-4111-8111-111111111111'::uuid)
with check (user_id='11111111-1111-4111-8111-111111111111'::uuid);
create policy student_favorites_demo_all on public.student_favorites for all to anon
using (user_id='11111111-1111-4111-8111-111111111111'::uuid)
with check (user_id='11111111-1111-4111-8111-111111111111'::uuid);
create policy support_tickets_demo_all on public.support_tickets for all to anon
using (user_id='11111111-1111-4111-8111-111111111111'::uuid)
with check (user_id='11111111-1111-4111-8111-111111111111'::uuid);
create policy support_faq_public_read on public.support_faq for select to anon,authenticated using (published);
create policy course_certificates_demo_read on public.course_certificates for select to anon using (is_demo);

create policy community_groups_public_read on public.community_groups for select to anon,authenticated using (visibility='public' and status='active');
create policy community_groups_demo_write on public.community_groups for all to anon
using (is_demo or owner_id in ('11111111-1111-4111-8111-111111111111'::uuid,'22222222-2222-4222-8222-222222222222'::uuid,'c3942032-967a-4cde-b00c-22446584e699'::uuid))
with check (owner_id in ('11111111-1111-4111-8111-111111111111'::uuid,'22222222-2222-4222-8222-222222222222'::uuid,'c3942032-967a-4cde-b00c-22446584e699'::uuid));
create policy community_members_demo_all on public.community_group_members for all to anon
using (user_id in ('11111111-1111-4111-8111-111111111111'::uuid,'22222222-2222-4222-8222-222222222222'::uuid,'c3942032-967a-4cde-b00c-22446584e699'::uuid,'33333333-3333-4333-8333-333333333333'::uuid))
with check (user_id in ('11111111-1111-4111-8111-111111111111'::uuid,'22222222-2222-4222-8222-222222222222'::uuid,'c3942032-967a-4cde-b00c-22446584e699'::uuid,'33333333-3333-4333-8333-333333333333'::uuid));
create policy community_posts_public_read on public.community_posts for select to anon,authenticated using (status='published');
create policy community_posts_demo_write on public.community_posts for all to anon
using (is_demo or author_id in ('11111111-1111-4111-8111-111111111111'::uuid,'22222222-2222-4222-8222-222222222222'::uuid,'c3942032-967a-4cde-b00c-22446584e699'::uuid))
with check (author_id in ('11111111-1111-4111-8111-111111111111'::uuid,'22222222-2222-4222-8222-222222222222'::uuid,'c3942032-967a-4cde-b00c-22446584e699'::uuid));
create policy community_comments_public_read on public.community_comments for select to anon,authenticated using (status='published');
create policy community_comments_demo_write on public.community_comments for all to anon
using (is_demo or author_id in ('11111111-1111-4111-8111-111111111111'::uuid,'22222222-2222-4222-8222-222222222222'::uuid,'c3942032-967a-4cde-b00c-22446584e699'::uuid))
with check (author_id in ('11111111-1111-4111-8111-111111111111'::uuid,'22222222-2222-4222-8222-222222222222'::uuid,'c3942032-967a-4cde-b00c-22446584e699'::uuid));
create policy community_likes_demo_all on public.community_post_likes for all to anon
using (user_id in ('11111111-1111-4111-8111-111111111111'::uuid,'22222222-2222-4222-8222-222222222222'::uuid,'c3942032-967a-4cde-b00c-22446584e699'::uuid))
with check (user_id in ('11111111-1111-4111-8111-111111111111'::uuid,'22222222-2222-4222-8222-222222222222'::uuid,'c3942032-967a-4cde-b00c-22446584e699'::uuid));
create policy community_reports_demo_all on public.community_reports for all to anon
using (reporter_id='11111111-1111-4111-8111-111111111111'::uuid)
with check (reporter_id='11111111-1111-4111-8111-111111111111'::uuid);

create policy opportunities_public_read on public.opportunities for select to anon,authenticated using (status='open' or is_demo);
create policy opportunity_favorites_demo_all on public.opportunity_favorites for all to anon
using (user_id='11111111-1111-4111-8111-111111111111'::uuid)
with check (user_id='11111111-1111-4111-8111-111111111111'::uuid);
create policy opportunity_applications_demo_all on public.opportunity_applications for all to anon
using (applicant_id='11111111-1111-4111-8111-111111111111'::uuid)
with check (applicant_id='11111111-1111-4111-8111-111111111111'::uuid);

grant select,insert,update,delete on public.student_notifications,public.student_preferences,public.student_favorites,public.support_tickets,
public.community_groups,public.community_group_members,public.community_posts,public.community_comments,public.community_post_likes,public.community_reports,
public.opportunity_favorites,public.opportunity_applications to anon;
grant select on public.support_faq,public.course_certificates,public.opportunities to anon,authenticated;