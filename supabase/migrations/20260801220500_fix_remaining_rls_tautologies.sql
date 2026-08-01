drop policy if exists "dev_student_enrollments_read" on public.enrollments;
drop policy if exists "dev_student_progress_read" on public.lesson_progress;
drop policy if exists "financial_settings_read" on public.platform_financial_settings;

create policy "dev_student_enrollments_read"
on public.enrollments for select to anon
using (
  exists (
    select 1
    from public.user_profiles p
    where p.user_id = enrollments.user_id
      and p.role = 'student'
      and p.is_demo = true
  )
);

create policy "dev_student_progress_read"
on public.lesson_progress for select to anon
using (
  exists (
    select 1
    from public.user_profiles p
    where p.user_id = lesson_progress.user_id
      and p.role = 'student'
      and p.is_demo = true
  )
);

create policy "financial_settings_read"
on public.platform_financial_settings for select to anon, authenticated
using (id = true);
