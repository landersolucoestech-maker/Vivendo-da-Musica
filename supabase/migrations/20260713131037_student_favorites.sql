create table public.student_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  beat_id uuid references public.beats(id) on delete cascade,
  content_id uuid references public.academy_contents(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint student_favorites_exactly_one_target check (
    num_nonnulls(course_id, beat_id, content_id) = 1
  )
);

create unique index student_favorites_user_course_key
  on public.student_favorites (user_id, course_id)
  where course_id is not null;

create unique index student_favorites_user_beat_key
  on public.student_favorites (user_id, beat_id)
  where beat_id is not null;

create unique index student_favorites_user_content_key
  on public.student_favorites (user_id, content_id)
  where content_id is not null;

create index student_favorites_course_idx on public.student_favorites (course_id) where course_id is not null;
create index student_favorites_beat_idx on public.student_favorites (beat_id) where beat_id is not null;
create index student_favorites_content_idx on public.student_favorites (content_id) where content_id is not null;

alter table public.student_favorites enable row level security;

create policy "Students view own favorites"
  on public.student_favorites
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Students add own favorites"
  on public.student_favorites
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Students remove own favorites"
  on public.student_favorites
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.student_favorites from anon, authenticated;
grant select, insert, delete on table public.student_favorites to authenticated;
