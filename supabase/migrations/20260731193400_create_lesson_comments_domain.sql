create table if not exists public.lesson_comments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  author_id uuid not null references public.user_profiles(user_id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  status text not null default 'published' check (status in ('published','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lesson_comments_lesson_created_idx on public.lesson_comments(lesson_id, created_at desc);
create index if not exists lesson_comments_author_idx on public.lesson_comments(author_id);

alter table public.lesson_comments enable row level security;

drop policy if exists "lesson_comments_authenticated_read" on public.lesson_comments;
create policy "lesson_comments_authenticated_read"
on public.lesson_comments
for select
to authenticated
using (status = 'published' or author_id = auth.uid());

drop policy if exists "lesson_comments_owner_insert" on public.lesson_comments;
create policy "lesson_comments_owner_insert"
on public.lesson_comments
for insert
to authenticated
with check (author_id = auth.uid());

drop policy if exists "lesson_comments_owner_update" on public.lesson_comments;
create policy "lesson_comments_owner_update"
on public.lesson_comments
for update
to authenticated
using (author_id = auth.uid())
with check (author_id = auth.uid());

-- Temporário no branch Supabase dev para revisão sem autenticação.
drop policy if exists "dev_review_lesson_comments" on public.lesson_comments;
create policy "dev_review_lesson_comments"
on public.lesson_comments
for all
to anon
using (true)
with check (true);

insert into public.lesson_comments (lesson_id, author_id, body, status, created_at)
values
  ('95913cf3-a5e3-4b52-a729-b7449ea4f1fb', 'c3942032-967a-4cde-b00c-22446584e699', 'Material introdutório revisado no ambiente de desenvolvimento.', 'published', now() - interval '1 day')
on conflict do nothing;
