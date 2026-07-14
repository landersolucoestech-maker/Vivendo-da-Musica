-- Existing public course policies call both helpers for anonymous requests.
-- Without EXECUTE, PostgreSQL aborts before the published-course policy can allow the row.
grant execute on function public.is_enrolled(uuid) to anon;
grant execute on function public.is_course_staff(uuid) to anon;

create table public.lesson_comments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lesson_comments_lesson_created_idx
  on public.lesson_comments (lesson_id, created_at desc);
create index lesson_comments_author_idx
  on public.lesson_comments (author_id);

alter table public.lesson_comments enable row level security;

create policy "Course members read lesson comments"
  on public.lesson_comments for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.lessons l
      join public.course_modules m on m.id = l.module_id
      join public.courses c on c.id = m.course_id
      where l.id = lesson_comments.lesson_id
        and (
          c.instructor_id = (select auth.uid())
          or exists (
            select 1 from public.enrollments e
            where e.course_id = c.id
              and e.user_id = (select auth.uid())
              and e.status = 'active'
          )
        )
    )
  );

create policy "Course members create lesson comments"
  on public.lesson_comments for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1
      from public.lessons l
      join public.course_modules m on m.id = l.module_id
      join public.courses c on c.id = m.course_id
      where l.id = lesson_comments.lesson_id
        and (
          c.instructor_id = (select auth.uid())
          or exists (
            select 1 from public.enrollments e
            where e.course_id = c.id
              and e.user_id = (select auth.uid())
              and e.status = 'active'
          )
        )
    )
  );

create policy "Authors update own lesson comments"
  on public.lesson_comments for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

create policy "Authors or staff delete lesson comments"
  on public.lesson_comments for delete to authenticated
  using (author_id = (select auth.uid()) or public.is_admin());

create trigger update_lesson_comments_updated_at
  before update on public.lesson_comments
  for each row execute function public.update_updated_at_column();

grant select, insert, update, delete on table public.lesson_comments to authenticated;
grant all on table public.lesson_comments to service_role;
