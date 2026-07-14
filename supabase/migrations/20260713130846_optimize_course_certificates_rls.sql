drop policy "Students can view their own certificates" on public.course_certificates;

create policy "Students can view their own certificates"
  on public.course_certificates
  for select
  to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());
