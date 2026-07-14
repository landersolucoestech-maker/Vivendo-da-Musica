-- =========================================================================
-- Phase 1: Multi-course foundation.
--
-- Renames the Portuguese single-course schema (modulos/aulas/...) to an
-- English multi-course schema, introduces courses/enrollments/roles as the
-- single source of truth for access, and locks down RLS + storage that the
-- previous migration (20250825021524) had left fully public.
-- =========================================================================

create extension if not exists pgcrypto;

create type public.course_status as enum ('draft', 'published', 'archived');
create type public.enrollment_status as enum ('active', 'revoked');
create type public.enrollment_source as enum ('manual', 'stripe');
create type public.user_role as enum ('student', 'instructor', 'admin', 'super_admin');

-- ---------------------------------------------------------------------
-- courses
-- ---------------------------------------------------------------------
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  thumbnail_url text,
  price_cents integer not null default 0,
  currency text not null default 'BRL',
  status public.course_status not null default 'draft',
  instructor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger update_courses_updated_at
  before update on public.courses
  for each row execute function update_updated_at_column();

-- ---------------------------------------------------------------------
-- modulos -> course_modules
-- ---------------------------------------------------------------------
alter table public.modulos rename to course_modules;
alter table public.course_modules rename column titulo to title;
alter table public.course_modules rename column descricao to description;
alter table public.course_modules rename column ordem to order_index;
-- 'criado_em' and 'curso_id' are schema drift (present in the live DB /
-- generated types but never created by any migration file) -- drop them
-- defensively before adding the real FK column under its new name.
alter table public.course_modules drop column if exists criado_em;
alter table public.course_modules drop column if exists curso_id;
alter table public.course_modules add column course_id uuid references public.courses(id) on delete cascade;

-- Seed exactly one course to own the existing modules/lessons. No
-- enrollments are created here -- that is a deliberate known gap until an
-- admin grants access manually or Phase 2 ships real checkout.
insert into public.courses (title, slug, description, status, price_cents, currency)
select
  'Vivendo da Música - Produção de Funk',
  'vivendo-da-musica',
  'Curso original migrado para a nova estrutura multi-curso.',
  'published',
  0,
  'BRL'
where exists (select 1 from public.course_modules)
  and not exists (select 1 from public.courses where slug = 'vivendo-da-musica');

update public.course_modules
set course_id = (select id from public.courses where slug = 'vivendo-da-musica')
where course_id is null;

alter table public.course_modules alter column course_id set not null;

-- ---------------------------------------------------------------------
-- aulas -> lessons
-- ---------------------------------------------------------------------
alter table public.aulas rename to lessons;
alter table public.lessons rename column modulo_id to module_id;
alter table public.lessons rename column titulo to title;
alter table public.lessons rename column descricao to description;
alter table public.lessons rename column ordem to order_index;
alter table public.lessons rename column video to video_url;
alter table public.lessons rename column duracao to duration_minutes;
alter table public.lessons drop column if exists criado_em;

-- ---------------------------------------------------------------------
-- progresso_aulas -> lesson_progress
-- ---------------------------------------------------------------------
alter table public.progresso_aulas rename to lesson_progress;
alter table public.lesson_progress rename column aula_id to lesson_id;
alter table public.lesson_progress rename column completada to completed;
alter table public.lesson_progress rename column progresso_percentual to progress_percentage;
alter table public.lesson_progress rename column tempo_assistido to watched_seconds;
alter table public.lesson_progress rename column ultima_visualizacao to last_viewed_at;

-- ---------------------------------------------------------------------
-- lesson_files: rename FK column for consistency
-- ---------------------------------------------------------------------
alter table public.lesson_files rename column aula_id to lesson_id;

-- ---------------------------------------------------------------------
-- user_profiles: role + full_name
-- ---------------------------------------------------------------------
alter table public.user_profiles add column role public.user_role not null default 'student';
alter table public.user_profiles add column full_name text;

-- ---------------------------------------------------------------------
-- enrollments -- single source of truth for "can this user see this course"
-- ---------------------------------------------------------------------
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status public.enrollment_status not null default 'active',
  source public.enrollment_source not null default 'manual',
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create trigger update_enrollments_updated_at
  before update on public.enrollments
  for each row execute function update_updated_at_column();

-- ---------------------------------------------------------------------
-- SECURITY DEFINER helper functions.
-- These run with the function owner's privileges and bypass the caller's
-- RLS, which is the standard safe way to check roles/enrollment from inside
-- a policy without causing recursive-RLS evaluation.
-- ---------------------------------------------------------------------
create or replace function public.current_role()
returns public.user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.user_profiles where user_id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_role() in ('instructor', 'admin', 'super_admin'), false);
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_role() in ('admin', 'super_admin'), false);
$$;

create or replace function public.is_enrolled(target_course_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.enrollments
    where user_id = auth.uid()
      and course_id = target_course_id
      and status = 'active'
  );
$$;

create or replace function public.is_course_staff(target_course_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_admin() or exists (
    select 1 from public.courses
    where id = target_course_id
      and instructor_id = auth.uid()
  );
$$;

grant execute on function public.current_role() to authenticated, anon;
grant execute on function public.is_staff() to authenticated, anon;
grant execute on function public.is_admin() to authenticated, anon;
grant execute on function public.is_enrolled(uuid) to authenticated, anon;
grant execute on function public.is_course_staff(uuid) to authenticated, anon;

-- ---------------------------------------------------------------------
-- RLS: courses
-- ---------------------------------------------------------------------
alter table public.courses enable row level security;

create policy "Published courses are publicly visible"
  on public.courses for select
  using (status = 'published');

create policy "Enrolled students can view their course"
  on public.courses for select
  using (public.is_enrolled(id));

create policy "Course staff can view their course"
  on public.courses for select
  using (public.is_course_staff(id));

-- ---------------------------------------------------------------------
-- RLS: course_modules -- drop the fully-public policy from the previous
-- migration, replace with enrollment/staff-gated access. No public/
-- marketing access here: structure is not needed pre-purchase.
-- ---------------------------------------------------------------------
drop policy if exists "Public can view modules" on public.course_modules;
drop policy if exists "Authenticated users can view modules" on public.course_modules;
drop policy if exists "Módulos são visíveis para todos" on public.course_modules;

create policy "Enrolled students can view modules"
  on public.course_modules for select
  using (public.is_enrolled(course_id));

create policy "Course staff can view modules"
  on public.course_modules for select
  using (public.is_course_staff(course_id));

-- ---------------------------------------------------------------------
-- RLS: lessons
-- ---------------------------------------------------------------------
drop policy if exists "Public can view lessons" on public.lessons;
drop policy if exists "Authenticated users can view lessons" on public.lessons;
drop policy if exists "Aulas são visíveis para todos" on public.lessons;

create policy "Enrolled students can view lessons"
  on public.lessons for select
  using (
    exists (
      select 1 from public.course_modules cm
      where cm.id = lessons.module_id
        and public.is_enrolled(cm.course_id)
    )
  );

create policy "Course staff can view lessons"
  on public.lessons for select
  using (
    exists (
      select 1 from public.course_modules cm
      where cm.id = lessons.module_id
        and public.is_course_staff(cm.course_id)
    )
  );

-- ---------------------------------------------------------------------
-- RLS: lesson_files -- metadata requires enrollment; actual file bytes are
-- separately gated by storage privacy + signed URLs (see bottom of file).
-- ---------------------------------------------------------------------
drop policy if exists "Public can view lesson files" on public.lesson_files;
drop policy if exists "Authenticated users can view lesson files" on public.lesson_files;
drop policy if exists "Anyone can view lesson files" on public.lesson_files;
drop policy if exists "Authenticated users can manage lesson files" on public.lesson_files;

create policy "Enrolled students can view lesson file metadata"
  on public.lesson_files for select
  using (
    exists (
      select 1 from public.lessons l
      join public.course_modules cm on cm.id = l.module_id
      where l.id = lesson_files.lesson_id
        and public.is_enrolled(cm.course_id)
    )
  );

create policy "Course staff can manage lesson file metadata"
  on public.lesson_files for all
  using (
    exists (
      select 1 from public.lessons l
      join public.course_modules cm on cm.id = l.module_id
      where l.id = lesson_files.lesson_id
        and public.is_course_staff(cm.course_id)
    )
  );

-- ---------------------------------------------------------------------
-- RLS: enrollments
-- ---------------------------------------------------------------------
alter table public.enrollments enable row level security;

create policy "Users can view their own enrollments"
  on public.enrollments for select
  using (auth.uid() = user_id);

create policy "Course staff can view enrollments for their course"
  on public.enrollments for select
  using (public.is_course_staff(course_id));

create policy "Course staff can grant enrollments for their course"
  on public.enrollments for insert
  with check (public.is_course_staff(course_id));

create policy "Course staff can update enrollments for their course"
  on public.enrollments for update
  using (public.is_course_staff(course_id));

-- ---------------------------------------------------------------------
-- RLS: user_profiles -- users can edit their own profile but cannot
-- self-escalate role; staff can view all profiles (for a future admin UI).
-- ---------------------------------------------------------------------
drop policy if exists "Users can update their own profile" on public.user_profiles;

create policy "Users can update their own profile (role excluded)"
  on public.user_profiles for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and role = (select up.role from public.user_profiles up where up.user_id = auth.uid())
  );

create policy "Staff can view all profiles"
  on public.user_profiles for select
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- Public marketing preview: since course_modules/lessons RLS above now
-- requires enrollment unconditionally, this view is the only way an
-- anonymous visitor can see anything about a published course (for a
-- future public catalog page) -- it deliberately excludes module/lesson
-- content and instructor_id.
-- ---------------------------------------------------------------------
create or replace view public.published_courses_preview as
select id, title, slug, description, thumbnail_url, price_cents, currency
from public.courses
where status = 'published';

grant select on public.published_courses_preview to anon, authenticated;

-- ---------------------------------------------------------------------
-- Storage: flip paid-content buckets to private (they were `public = true`,
-- meaning paid ZIP/Ableton files were directly downloadable by anyone with
-- the URL), and tighten write access from "any authenticated user" to
-- course staff only.
-- ---------------------------------------------------------------------
update storage.buckets set public = false where id in ('lesson-samples', 'lesson-projects');

drop policy if exists "Lesson samples are publicly accessible" on storage.objects;
drop policy if exists "Lesson projects are publicly accessible" on storage.objects;
drop policy if exists "Allow public read access to lesson samples" on storage.objects;
drop policy if exists "Allow public read access to lesson projects" on storage.objects;
drop policy if exists "Authenticated users can upload lesson samples" on storage.objects;
drop policy if exists "Authenticated users can upload lesson projects" on storage.objects;
drop policy if exists "Authenticated users can update lesson samples" on storage.objects;
drop policy if exists "Authenticated users can update lesson projects" on storage.objects;
drop policy if exists "Authenticated users can delete lesson samples" on storage.objects;
drop policy if exists "Authenticated users can delete lesson projects" on storage.objects;
drop policy if exists "Allow authenticated users to upload lesson samples" on storage.objects;
drop policy if exists "Allow authenticated users to upload lesson projects" on storage.objects;
drop policy if exists "Allow authenticated users to update lesson samples" on storage.objects;
drop policy if exists "Allow authenticated users to update lesson projects" on storage.objects;
drop policy if exists "Allow authenticated users to delete lesson samples" on storage.objects;
drop policy if exists "Allow authenticated users to delete lesson projects" on storage.objects;

-- No SELECT policy is (re)created for these buckets: all reads go through
-- the get-signed-lesson-url Edge Function using the service role, which
-- mints short-lived signed URLs and bypasses storage RLS entirely. Trusting
-- the client to call createSignedUrl directly with the anon key would not
-- be safely enrollment-gated, hence the Edge Function.
create policy "Course staff can upload lesson files"
  on storage.objects for insert
  with check (bucket_id in ('lesson-samples', 'lesson-projects') and public.is_staff());

create policy "Course staff can update lesson files"
  on storage.objects for update
  using (bucket_id in ('lesson-samples', 'lesson-projects') and public.is_staff());

create policy "Course staff can delete lesson files"
  on storage.objects for delete
  using (bucket_id in ('lesson-samples', 'lesson-projects') and public.is_staff());
