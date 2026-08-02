-- Companies may read the basic identity of candidates who applied to their own opportunities.

drop policy if exists user_profiles_authenticated_read on public.user_profiles;
create policy user_profiles_authenticated_read
on public.user_profiles for select to authenticated
using (
  user_id = (select auth.uid())
  or public.is_platform_staff()
  or exists (
    select 1
    from public.opportunity_applications application
    join public.opportunities opportunity on opportunity.id = application.opportunity_id
    where application.applicant_id = user_profiles.user_id
      and public.is_company_member(opportunity.company_id)
  )
);
