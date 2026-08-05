begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

select ok(
  not has_function_privilege('anon', 'public.admin_grant_company_credits(uuid,uuid,integer,text)', 'EXECUTE'),
  'anon cannot execute real credit administration RPC'
);

select ok(
  has_function_privilege('authenticated', 'public.admin_set_account_capability(uuid,text,text,boolean)', 'EXECUTE'),
  'authenticated staff retains account capability administration RPC'
);

select ok(
  not has_function_privilege('anon', 'public.request_account_capability(text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.request_account_capability(text)', 'EXECUTE'),
  'account capability request requires authentication'
);

select ok(
  not has_function_privilege('anon', 'public.capture_observability_snapshot()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.capture_observability_snapshot()', 'EXECUTE')
  and has_function_privilege('service_role', 'public.capture_observability_snapshot()', 'EXECUTE'),
  'observability snapshot is service-only'
);

select ok(
  not has_function_privilege('authenticated', 'public.cleanup_observability_data()', 'EXECUTE')
  and has_function_privilege('service_role', 'public.cleanup_observability_data()', 'EXECUTE'),
  'observability cleanup is service-only'
);

select ok(
  has_function_privilege('anon', 'public.accept_demo_service_milestone(uuid,uuid)', 'EXECUTE')
  and has_function_privilege('anon', 'public.resolve_affiliate_referral(text)', 'EXECUTE'),
  'intentional demo and public referral RPCs remain callable anonymously'
);

select * from finish();
rollback;
