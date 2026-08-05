-- Consolidate opportunity/application RLS and protect immutable identifiers
-- and credit-controlled publication fields from direct client DML.

create or replace function app_private.protect_opportunity_client_update()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if new.id is distinct from old.id
      or new.company_id is distinct from old.company_id
      or new.created_by is distinct from old.created_by
      or new.owner_id is distinct from old.owner_id
      or new.is_demo is distinct from old.is_demo
      or new.created_at is distinct from old.created_at
      or new.application_count is distinct from old.application_count
      or new.credit_lot_id is distinct from old.credit_lot_id
      or new.credit_event_id is distinct from old.credit_event_id
      or new.renewal_count is distinct from old.renewal_count
      or new.published_at is distinct from old.published_at
      or new.posting_expires_at is distinct from old.posting_expires_at then
      raise exception 'Campos internos da oportunidade não podem ser alterados diretamente.';
    end if;

    if old.status <> 'open' and new.status = 'open' then
      raise exception 'A reabertura exige renovação com consumo de crédito.';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function app_private.protect_opportunity_client_update() from public, anon, authenticated;

drop trigger if exists protect_opportunity_client_update on public.opportunities;
create trigger protect_opportunity_client_update
before update on public.opportunities
for each row execute function app_private.protect_opportunity_client_update();

create or replace function app_private.protect_opportunity_application_client_update()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
declare
  caller_id uuid := (select auth.uid());
  caller_is_company boolean := false;
  caller_is_staff boolean := false;
begin
  if current_user in ('anon', 'authenticated') then
    if new.id is distinct from old.id
      or new.opportunity_id is distinct from old.opportunity_id
      or new.applicant_id is distinct from old.applicant_id
      or new.created_at is distinct from old.created_at then
      raise exception 'Identidade da candidatura não pode ser alterada.';
    end if;
  end if;

  if current_user = 'authenticated' and caller_id = old.applicant_id then
    select public.is_company_member(opportunity.company_id)
    into caller_is_company
    from public.opportunities as opportunity
    where opportunity.id = old.opportunity_id;

    caller_is_staff := public.is_platform_staff();

    if not coalesce(caller_is_company, false) and not caller_is_staff then
      if old.status not in ('submitted', 'reviewing') or new.status <> 'withdrawn' then
        raise exception 'O candidato somente pode retirar uma candidatura ativa.';
      end if;

      if new.cover_letter is distinct from old.cover_letter
        or new.portfolio_url is distinct from old.portfolio_url
        or new.recruiter_notes is distinct from old.recruiter_notes
        or new.reviewed_at is distinct from old.reviewed_at
        or new.decided_at is distinct from old.decided_at
        or new.applicant_name_snapshot is distinct from old.applicant_name_snapshot then
        raise exception 'A retirada não pode alterar dados de recrutamento.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function app_private.protect_opportunity_application_client_update() from public, anon, authenticated;

drop trigger if exists protect_opportunity_application_client_update on public.opportunity_applications;
create trigger protect_opportunity_application_client_update
before update on public.opportunity_applications
for each row execute function app_private.protect_opportunity_application_client_update();

-- Opportunities.
drop policy if exists "Public reads open opportunities" on public.opportunities;
drop policy if exists opportunities_authenticated_read on public.opportunities;
create policy opportunities_authenticated_read
on public.opportunities
for select
to authenticated
using (
  status = 'open'
  or public.is_company_member(company_id)
  or public.is_platform_staff()
);

drop policy if exists "Users submit opportunities" on public.opportunities;
drop policy if exists opportunities_company_insert on public.opportunities;
create policy opportunities_company_insert
on public.opportunities
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and public.is_company_member(company_id)
  and status in ('draft', 'pending')
  and is_demo = false
  and application_count = 0
  and credit_lot_id is null
  and credit_event_id is null
  and published_at is null
  and posting_expires_at is null
  and renewal_count = 0
);

drop policy if exists "Owners edit unpublished opportunities" on public.opportunities;
drop policy if exists "Staff moderates opportunities" on public.opportunities;
drop policy if exists opportunities_company_update on public.opportunities;
create policy opportunities_company_update
on public.opportunities
for update
to authenticated
using (
  public.is_company_member(company_id)
  or public.is_platform_staff()
)
with check (
  public.is_company_member(company_id)
  or public.is_platform_staff()
);

drop policy if exists "Owners delete unpublished opportunities" on public.opportunities;
drop policy if exists opportunities_company_delete on public.opportunities;
create policy opportunities_company_delete
on public.opportunities
for delete
to authenticated
using (
  public.is_company_member(company_id)
  or public.is_platform_staff()
);

-- Applications.
drop policy if exists "Users apply as themselves" on public.opportunity_applications;
drop policy if exists opportunity_applications_candidate_insert on public.opportunity_applications;
create policy opportunity_applications_candidate_insert
on public.opportunity_applications
for insert
to authenticated
with check (
  applicant_id = (select auth.uid())
  and status = 'submitted'
  and recruiter_notes is null
  and reviewed_at is null
  and decided_at is null
  and exists (
    select 1
    from public.opportunities as opportunity
    where opportunity.id = opportunity_applications.opportunity_id
      and opportunity.status = 'open'
      and (opportunity.application_deadline is null or opportunity.application_deadline >= current_date)
      and (opportunity.deadline_at is null or opportunity.deadline_at > now())
      and (opportunity.posting_expires_at is null or opportunity.posting_expires_at > now())
  )
);

drop policy if exists opportunity_applications_anon_insert on public.opportunity_applications;
create policy opportunity_applications_anon_insert
on public.opportunity_applications
for insert
to anon
with check (
  applicant_id = '11111111-1111-4111-8111-111111111111'::uuid
  and status = 'submitted'
  and recruiter_notes is null
  and reviewed_at is null
  and decided_at is null
  and exists (
    select 1
    from public.opportunities as opportunity
    where opportunity.id = opportunity_applications.opportunity_id
      and opportunity.status = 'open'
      and opportunity.is_demo = true
      and (opportunity.application_deadline is null or opportunity.application_deadline >= current_date)
      and (opportunity.deadline_at is null or opportunity.deadline_at > now())
      and (opportunity.posting_expires_at is null or opportunity.posting_expires_at > now())
  )
);

drop policy if exists "Applicants and owners read applications" on public.opportunity_applications;
drop policy if exists opportunity_applications_authenticated_read on public.opportunity_applications;
create policy opportunity_applications_authenticated_read
on public.opportunity_applications
for select
to authenticated
using (
  applicant_id = (select auth.uid())
  or public.is_platform_staff()
  or public.is_company_member((
    select opportunity.company_id
    from public.opportunities as opportunity
    where opportunity.id = opportunity_applications.opportunity_id
  ))
);

drop policy if exists "Applicants withdraw applications" on public.opportunity_applications;
drop policy if exists "Owners manage applications" on public.opportunity_applications;
drop policy if exists opportunity_applications_company_update on public.opportunity_applications;
create policy opportunity_applications_authenticated_update
on public.opportunity_applications
for update
to authenticated
using (
  (
    applicant_id = (select auth.uid())
    and status in ('submitted', 'reviewing')
  )
  or public.is_platform_staff()
  or public.is_company_member((
    select opportunity.company_id
    from public.opportunities as opportunity
    where opportunity.id = opportunity_applications.opportunity_id
  ))
)
with check (
  (
    applicant_id = (select auth.uid())
    and status = 'withdrawn'
  )
  or public.is_platform_staff()
  or public.is_company_member((
    select opportunity.company_id
    from public.opportunities as opportunity
    where opportunity.id = opportunity_applications.opportunity_id
  ))
);
