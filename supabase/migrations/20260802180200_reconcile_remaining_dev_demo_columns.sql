-- Existing production-grade domains predate the hosted review fixtures.
-- Add only the fixture discriminator required by the following dev policies.

alter table public.course_certificates
  add column if not exists is_demo boolean not null default false;

alter table public.community_groups
  add column if not exists is_demo boolean not null default false;

alter table public.community_posts
  add column if not exists is_demo boolean not null default false;

alter table public.community_comments
  add column if not exists is_demo boolean not null default false;

alter table public.opportunities
  add column if not exists is_demo boolean not null default false;
