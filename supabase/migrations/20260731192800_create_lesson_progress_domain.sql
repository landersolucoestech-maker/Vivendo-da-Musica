create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed boolean not null default false,
  progress_percentage integer not null default 0 check (progress_percentage between 0 and 100),
  watched_seconds integer not null default 0 check (watched_seconds >= 0),
  last_viewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create index if not exists lesson_progress_user_id_idx on public.lesson_progress(user_id);
create index if not exists lesson_progress_lesson_id_idx on public.lesson_progress(lesson_id);

alter table public.lesson_progress enable row level security;

drop policy if exists "lesson_progress_owner_select" on public.lesson_progress;
create policy "lesson_progress_owner_select"
on public.lesson_progress
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "lesson_progress_owner_insert" on public.lesson_progress;
create policy "lesson_progress_owner_insert"
on public.lesson_progress
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "lesson_progress_owner_update" on public.lesson_progress;
create policy "lesson_progress_owner_update"
on public.lesson_progress
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Temporário no branch Supabase dev enquanto o bypass visual estiver ativo.
drop policy if exists "dev_review_lesson_progress" on public.lesson_progress;
create policy "dev_review_lesson_progress"
on public.lesson_progress
for all
to anon
using (true)
with check (true);

insert into public.lesson_progress (user_id, lesson_id, completed, progress_percentage, watched_seconds, last_viewed_at)
values
  ('c3942032-967a-4cde-b00c-22446584e699', '95913cf3-a5e3-4b52-a729-b7449ea4f1fb', true, 100, 900, now() - interval '2 days'),
  ('c3942032-967a-4cde-b00c-22446584e699', '76a0e3b0-12c0-483d-b08d-ebfebf09c57c', true, 100, 1500, now() - interval '1 day'),
  ('c3942032-967a-4cde-b00c-22446584e699', '2f5edefa-cd11-49c1-b5e5-105c5b850eb7', false, 40, 720, now())
on conflict (user_id, lesson_id) do update
set completed = excluded.completed,
    progress_percentage = excluded.progress_percentage,
    watched_seconds = excluded.watched_seconds,
    last_viewed_at = excluded.last_viewed_at,
    updated_at = now();
