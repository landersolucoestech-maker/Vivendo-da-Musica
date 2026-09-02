begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

select is(
  (
    select count(*)::bigint
    from pg_trigger
    where tgrelid = 'public.opportunity_applications'::regclass
      and tgname = 'protect_opportunity_application_client_update'
      and not tgisinternal
  ),
  1::bigint,
  'application immutable-field trigger remains installed'
);

select ok(
  pg_get_functiondef('app_private.protect_opportunity_application_client_update()'::regprocedure)
    like '%A empresa não pode alterar dados enviados pelo candidato.%',
  'application trigger explicitly protects candidate-authored fields from company edits'
);

select ok(
  pg_get_functiondef('app_private.protect_opportunity_application_client_update()'::regprocedure)
    like '%new.cover_letter is distinct from old.cover_letter%'
  and pg_get_functiondef('app_private.protect_opportunity_application_client_update()'::regprocedure)
    like '%new.portfolio_url is distinct from old.portfolio_url%'
  and pg_get_functiondef('app_private.protect_opportunity_application_client_update()'::regprocedure)
    like '%new.applicant_name_snapshot is distinct from old.applicant_name_snapshot%',
  'cover letter, application portfolio and applicant snapshot are immutable to recruiters'
);

select ok(
  pg_get_functiondef('app_private.protect_opportunity_application_client_update()'::regprocedure)
    like '%new.recruiter_notes is distinct from old.recruiter_notes%'
  and pg_get_functiondef('app_private.protect_opportunity_application_client_update()'::regprocedure)
    like '%new.reviewed_at is distinct from old.reviewed_at%'
  and pg_get_functiondef('app_private.protect_opportunity_application_client_update()'::regprocedure)
    like '%new.decided_at is distinct from old.decided_at%',
  'candidate withdrawal still cannot modify recruiter-owned review fields'
);

select * from finish();
rollback;
