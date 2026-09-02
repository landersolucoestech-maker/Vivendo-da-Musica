drop policy if exists opportunity_messages_authenticated_insert
  on public.opportunity_application_messages;

create policy opportunity_messages_authenticated_insert
on public.opportunity_application_messages
for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1
    from public.opportunity_applications application
    join public.opportunities opportunity
      on opportunity.id = application.opportunity_id
    where application.id = opportunity_application_messages.application_id
      and (
        (
          application.applicant_id = (select auth.uid())
          and opportunity_application_messages.sender_type = 'candidate'
        )
        or (
          public.is_company_member(opportunity.company_id)
          and opportunity_application_messages.sender_type = 'company'
        )
      )
  )
);
