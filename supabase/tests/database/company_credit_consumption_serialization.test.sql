begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

select ok(
  pg_get_functiondef('app_private.publish_company_opportunity_with_credit(uuid,text,text,text,text,text,text,text[],text[],integer,integer,text,date)'::regprocedure)
    like '%pg_advisory_xact_lock%company-credit:%',
  'company opportunity publication serializes credit consumption per company'
);

select ok(
  pg_get_functiondef('app_private.renew_company_opportunity_with_credit(uuid)'::regprocedure)
    like '%pg_advisory_xact_lock%company-credit:%',
  'company opportunity renewal serializes credit consumption per company'
);

select ok(
  pg_get_functiondef('app_private.publish_company_opportunity_with_credit(uuid,text,text,text,text,text,text,text[],text[],integer,integer,text,date)'::regprocedure)
    not ilike '%skip locked%'
  and pg_get_functiondef('app_private.renew_company_opportunity_with_credit(uuid)'::regprocedure)
    not ilike '%skip locked%',
  'credit consumers never skip a locked earlier-expiring lot'
);

select ok(
  (
    select bool_and(p.prosecdef)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app_private'
      and p.proname in ('publish_company_opportunity_with_credit', 'renew_company_opportunity_with_credit')
  ),
  'private credit consumption implementations remain SECURITY DEFINER'
);

select ok(
  not (
    select bool_or(p.prosecdef)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('publish_company_opportunity_with_credit', 'renew_company_opportunity_with_credit')
  )
  and has_function_privilege(
    'authenticated',
    'public.publish_company_opportunity_with_credit(uuid,text,text,text,text,text,text,text[],text[],integer,integer,text,date)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'anon',
    'public.publish_company_opportunity_with_credit(uuid,text,text,text,text,text,text,text[],text[],integer,integer,text,date)',
    'EXECUTE'
  )
  and has_function_privilege(
    'authenticated',
    'public.renew_company_opportunity_with_credit(uuid)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'anon',
    'public.renew_company_opportunity_with_credit(uuid)',
    'EXECUTE'
  ),
  'public credit RPC wrappers preserve their existing invoker and role boundary'
);

select * from finish();
rollback;
