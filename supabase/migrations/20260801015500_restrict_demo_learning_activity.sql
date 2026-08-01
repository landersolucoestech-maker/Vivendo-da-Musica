drop policy if exists dev_review_lesson_progress on public.lesson_progress;
drop policy if exists dev_review_lesson_comments on public.lesson_comments;

create policy dev_student_progress_read on public.lesson_progress for select to anon using (exists(select 1 from public.user_profiles p where p.user_id=user_id and p.role='student'));
create policy dev_student_progress_insert on public.lesson_progress for insert to anon with check (exists(select 1 from public.user_profiles p where p.user_id=user_id and p.role='student'));
create policy dev_student_progress_update on public.lesson_progress for update to anon using (exists(select 1 from public.user_profiles p where p.user_id=user_id and p.role='student')) with check (exists(select 1 from public.user_profiles p where p.user_id=user_id and p.role='student'));

create policy dev_student_comments_read on public.lesson_comments for select to anon using (status='published' or exists(select 1 from public.user_profiles p where p.user_id=author_id and p.role='student'));
create policy dev_student_comments_insert on public.lesson_comments for insert to anon with check (exists(select 1 from public.user_profiles p where p.user_id=author_id and p.role='student'));
create policy dev_student_comments_update on public.lesson_comments for update to anon using (exists(select 1 from public.user_profiles p where p.user_id=author_id and p.role='student')) with check (exists(select 1 from public.user_profiles p where p.user_id=author_id and p.role='student'));
create policy dev_student_comments_delete on public.lesson_comments for delete to anon using (exists(select 1 from public.user_profiles p where p.user_id=author_id and p.role='student'));
