alter table public.user_profiles
add column if not exists is_demo boolean not null default false;

update public.user_profiles
set is_demo = true
where full_name ilike '%desenvolvimento%';

drop policy if exists "dev_student_progress_insert" on public.lesson_progress;
drop policy if exists "dev_student_progress_update" on public.lesson_progress;
drop policy if exists "dev_student_comments_insert" on public.lesson_comments;
drop policy if exists "dev_student_comments_update" on public.lesson_comments;
drop policy if exists "dev_student_comments_delete" on public.lesson_comments;
drop policy if exists "dev_profiles_update" on public.user_profiles;

create policy "dev_student_progress_insert"
on public.lesson_progress for insert to anon
with check (
  exists (
    select 1
    from public.user_profiles p
    where p.user_id = lesson_progress.user_id
      and p.role = 'student'
      and p.is_demo = true
  )
);

create policy "dev_student_progress_update"
on public.lesson_progress for update to anon
using (
  exists (
    select 1
    from public.user_profiles p
    where p.user_id = lesson_progress.user_id
      and p.role = 'student'
      and p.is_demo = true
  )
)
with check (
  exists (
    select 1
    from public.user_profiles p
    where p.user_id = lesson_progress.user_id
      and p.role = 'student'
      and p.is_demo = true
  )
);

create policy "dev_student_comments_insert"
on public.lesson_comments for insert to anon
with check (
  exists (
    select 1
    from public.user_profiles p
    where p.user_id = lesson_comments.author_id
      and p.role = 'student'
      and p.is_demo = true
  )
);

create policy "dev_student_comments_update"
on public.lesson_comments for update to anon
using (
  exists (
    select 1
    from public.user_profiles p
    where p.user_id = lesson_comments.author_id
      and p.role = 'student'
      and p.is_demo = true
  )
)
with check (
  exists (
    select 1
    from public.user_profiles p
    where p.user_id = lesson_comments.author_id
      and p.role = 'student'
      and p.is_demo = true
  )
);

create policy "dev_student_comments_delete"
on public.lesson_comments for delete to anon
using (
  exists (
    select 1
    from public.user_profiles p
    where p.user_id = lesson_comments.author_id
      and p.role = 'student'
      and p.is_demo = true
  )
);

create policy "dev_profiles_update"
on public.user_profiles for update to anon
using (is_demo = true)
with check (is_demo = true);
