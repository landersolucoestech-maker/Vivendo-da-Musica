begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

select ok(
  not has_function_privilege('anon', 'public.current_account_capabilities()', 'EXECUTE')
  and not has_function_privilege('anon', 'public.has_account_capability(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.request_demo_account_capability(uuid,text)', 'EXECUTE'),
  'anonymous cannot execute account capability RPCs'
);

select ok(
  has_function_privilege('authenticated', 'public.current_account_capabilities()', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.has_account_capability(text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.request_demo_account_capability(uuid,text)', 'EXECUTE'),
  'authenticated retains account capability RPC access'
);

select ok(
  has_function_privilege('service_role', 'public.current_account_capabilities()', 'EXECUTE')
  and has_function_privilege('service_role', 'public.request_demo_account_capability(uuid,text)', 'EXECUTE'),
  'service role retains account capability RPC access'
);

select ok(
  not has_table_privilege('anon', 'public.account_capabilities', 'SELECT'),
  'anonymous cannot select capability rows directly'
);

select * from finish();
rollback;
