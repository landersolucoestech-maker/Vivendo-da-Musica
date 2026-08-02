-- Reconcile the historical Portuguese course schema with the expanded
-- development catalog before its fixtures are inserted.

alter table public.course_modules
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.lessons
  add column if not exists slug text,
  add column if not exists thumbnail_url text,
  add column if not exists status text not null default 'draft',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.lessons
set slug = 'aula-' || left(replace(id::text, '-', ''), 16)
where slug is null or btrim(slug) = '';

create unique index if not exists lessons_module_slug_compat_unique
  on public.lessons(module_id, slug);

alter table public.lesson_progress
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.enrollments
  add column if not exists enrolled_at timestamptz not null default now();
