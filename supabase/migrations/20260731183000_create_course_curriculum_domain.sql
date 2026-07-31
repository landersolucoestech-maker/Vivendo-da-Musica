create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'course_status'
  ) then
    create type public.course_status as enum ('draft', 'published', 'archived');
  end if;
end
$$;

create table if not exists public.user_profiles (
  user_id uuid primary key,
  full_name text,
  role text not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_role_check
    check (role in ('student', 'instructor', 'producer', 'admin', 'super_admin', 'affiliate'))
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  short_description text,
  description text,
  thumbnail_url text,
  category text,
  original_price_cents integer not null default 0,
  discount_cents integer not null default 0,
  price_cents integer generated always as (original_price_cents - discount_cents) stored,
  currency text not null default 'BRL',
  status public.course_status not null default 'draft',
  visibility text not null default 'private',
  instructor_id uuid references public.user_profiles(user_id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint courses_original_price_nonnegative check (original_price_cents >= 0),
  constraint courses_discount_nonnegative check (discount_cents >= 0),
  constraint courses_discount_not_above_original check (discount_cents <= original_price_cents),
  constraint courses_visibility_check check (visibility in ('public', 'private', 'unlisted'))
);

create table if not exists public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_modules_order_nonnegative check (order_index >= 0),
  constraint course_modules_course_order_unique unique (course_id, order_index)
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id) on delete cascade,
  title text not null,
  slug text not null,
  description text,
  video_url text,
  thumbnail_url text,
  duration_minutes integer,
  order_index integer not null default 0,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lessons_duration_nonnegative check (duration_minutes is null or duration_minutes >= 0),
  constraint lessons_order_nonnegative check (order_index >= 0),
  constraint lessons_status_check check (status in ('draft', 'published', 'archived')),
  constraint lessons_module_order_unique unique (module_id, order_index),
  constraint lessons_module_slug_unique unique (module_id, slug)
);

create table if not exists public.lesson_materials (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  name text not null,
  description text,
  material_type text not null default 'other',
  file_url text not null,
  mime_type text,
  size_bytes bigint,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_materials_type_check
    check (material_type in ('audio_project', 'wav', 'mp3', 'pdf', 'document', 'archive', 'other')),
  constraint lesson_materials_size_nonnegative check (size_bytes is null or size_bytes >= 0),
  constraint lesson_materials_order_nonnegative check (order_index >= 0),
  constraint lesson_materials_lesson_order_unique unique (lesson_id, order_index)
);

create index if not exists courses_status_idx on public.courses(status);
create index if not exists courses_instructor_id_idx on public.courses(instructor_id);
create index if not exists course_modules_course_id_idx on public.course_modules(course_id);
create index if not exists lessons_module_id_idx on public.lessons(module_id);
create index if not exists lesson_materials_lesson_id_idx on public.lesson_materials(lesson_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;
create trigger set_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_courses_updated_at on public.courses;
create trigger set_courses_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

drop trigger if exists set_course_modules_updated_at on public.course_modules;
create trigger set_course_modules_updated_at
before update on public.course_modules
for each row execute function public.set_updated_at();

drop trigger if exists set_lessons_updated_at on public.lessons;
create trigger set_lessons_updated_at
before update on public.lessons
for each row execute function public.set_updated_at();

drop trigger if exists set_lesson_materials_updated_at on public.lesson_materials;
create trigger set_lesson_materials_updated_at
before update on public.lesson_materials
for each row execute function public.set_updated_at();

alter table public.user_profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_materials enable row level security;

drop policy if exists dev_full_access_user_profiles on public.user_profiles;
create policy dev_full_access_user_profiles
on public.user_profiles for all to anon, authenticated
using (true) with check (true);

drop policy if exists dev_full_access_courses on public.courses;
create policy dev_full_access_courses
on public.courses for all to anon, authenticated
using (true) with check (true);

drop policy if exists dev_full_access_course_modules on public.course_modules;
create policy dev_full_access_course_modules
on public.course_modules for all to anon, authenticated
using (true) with check (true);

drop policy if exists dev_full_access_lessons on public.lessons;
create policy dev_full_access_lessons
on public.lessons for all to anon, authenticated
using (true) with check (true);

drop policy if exists dev_full_access_lesson_materials on public.lesson_materials;
create policy dev_full_access_lesson_materials
on public.lesson_materials for all to anon, authenticated
using (true) with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete
on public.user_profiles, public.courses, public.course_modules, public.lessons, public.lesson_materials
to anon, authenticated;
