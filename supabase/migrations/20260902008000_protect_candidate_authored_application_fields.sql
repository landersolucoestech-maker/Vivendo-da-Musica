create or replace function app_private.protect_opportunity_application_client_update()
returns trigger
language plpgsql
set search_path to 'public', 'auth', 'pg_temp'
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

  if current_user = 'authenticated' then
    select public.is_company_member(opportunity.company_id)
    into caller_is_company
    from public.opportunities as opportunity
    where opportunity.id = old.opportunity_id;

    caller_is_staff := public.is_platform_staff();

    if caller_id = old.applicant_id
      and not coalesce(caller_is_company, false)
      and not caller_is_staff then
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
    elsif coalesce(caller_is_company, false) and not caller_is_staff then
      if new.cover_letter is distinct from old.cover_letter
        or new.portfolio_url is distinct from old.portfolio_url
        or new.applicant_name_snapshot is distinct from old.applicant_name_snapshot then
        raise exception 'A empresa não pode alterar dados enviados pelo candidato.';
      end if;
    end if;
  end if;

  return new;
end;
$$;
