drop policy "Students add own favorites" on public.student_favorites;

create policy "Students add own published favorites"
  on public.student_favorites
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (course_id is null or exists (
      select 1 from public.courses c
      where c.id = course_id and c.status = 'published'
    ))
    and (beat_id is null or exists (
      select 1 from public.beats b
      where b.id = beat_id and b.status = 'published'
    ))
    and (content_id is null or exists (
      select 1 from public.academy_contents ac
      where ac.id = content_id and ac.status = 'published'
    ))
  );
