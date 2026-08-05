-- Avoid per-row re-evaluation of auth.uid() in legacy RLS policies.
-- The authorization semantics remain unchanged; the caller identity is read
-- once per statement through an initplan.

alter policy "Users can insert their own profile"
on public.user_profiles
with check ((select auth.uid()) = user_id);

alter policy "Users can update their own profile (role excluded)"
on public.user_profiles
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and role = (
    select profile.role
    from public.user_profiles as profile
    where profile.user_id = (select auth.uid())
  )
);

alter policy "Users can view their own profile"
on public.user_profiles
using ((select auth.uid()) = user_id);

alter policy "Users can insert their own progress"
on public.lesson_progress
with check ((select auth.uid()) = user_id);

alter policy "Users can update their own progress"
on public.lesson_progress
using ((select auth.uid()) = user_id);

alter policy "Users can view their own progress"
on public.lesson_progress
using ((select auth.uid()) = user_id);

alter policy "Users can view their own enrollments"
on public.enrollments
using ((select auth.uid()) = user_id);
