-- Correct the policy-name mismatch left by restrict_demo_enrollments.
-- The original dev_full_access_enrollments policy exposed every enrollment to
-- unrestricted anonymous and authenticated CRUD. Preserve only read access for
-- synthetic demo students enrolled in synthetic demo courses.

drop policy if exists dev_full_access_enrollments on public.enrollments;
drop policy if exists dev_student_enrollments_read on public.enrollments;

create policy dev_student_enrollments_read
on public.enrollments
for select
to anon
using (
  exists (
    select 1
    from public.user_profiles as profile
    where profile.user_id = enrollments.user_id
      and profile.role = 'student'
      and profile.is_demo = true
  )
  and exists (
    select 1
    from public.courses as course
    where course.id = enrollments.course_id
      and course.is_demo = true
  )
);

revoke insert, update, delete on public.enrollments from anon;
