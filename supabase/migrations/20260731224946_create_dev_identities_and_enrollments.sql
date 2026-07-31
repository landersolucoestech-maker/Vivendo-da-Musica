-- Development-only synthetic identities used by the unauthenticated review mode.
-- This migration is intended for the isolated Supabase dev branch only.

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  course_id uuid not null references public.courses(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'revoked', 'completed')),
  source text not null default 'development' check (source in ('development', 'manual', 'payment')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create index if not exists enrollments_user_id_idx on public.enrollments(user_id);
create index if not exists enrollments_course_id_idx on public.enrollments(course_id);

alter table public.enrollments enable row level security;

drop policy if exists dev_full_access_enrollments on public.enrollments;
create policy dev_full_access_enrollments
on public.enrollments
for all
to anon, authenticated
using (true)
with check (true);

grant select, insert, update, delete on public.enrollments to anon, authenticated;

insert into public.user_profiles (user_id, full_name, role)
values
  ('11111111-1111-4111-8111-111111111111', 'Aluno de Desenvolvimento', 'student'),
  ('22222222-2222-4222-8222-222222222222', 'Produtor de Desenvolvimento', 'producer'),
  ('33333333-3333-4333-8333-333333333333', 'Afiliado de Desenvolvimento', 'affiliate'),
  ('44444444-4444-4444-8444-444444444444', 'Administrador de Desenvolvimento', 'admin')
on conflict (user_id) do update
set full_name = excluded.full_name,
    role = excluded.role,
    updated_at = now();

insert into public.enrollments (user_id, course_id, status, source)
select
  '11111111-1111-4111-8111-111111111111'::uuid,
  c.id,
  'active',
  'development'
from public.courses c
where c.slug = 'producao-musical-do-zero-ao-profissional'
on conflict (user_id, course_id) do update
set status = excluded.status,
    source = excluded.source,
    updated_at = now();

update public.lesson_progress
set user_id = '11111111-1111-4111-8111-111111111111'::uuid,
    updated_at = now()
where user_id = 'c3942032-967a-4cde-b00c-22446584e699'::uuid;
