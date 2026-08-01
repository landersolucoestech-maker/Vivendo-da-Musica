drop policy if exists dev_review_enrollments on public.enrollments;
create policy dev_student_enrollments_read on public.enrollments for select to anon using (exists(select 1 from public.user_profiles p where p.user_id=user_id and p.role='student'));
