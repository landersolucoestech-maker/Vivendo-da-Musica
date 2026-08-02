begin;

select plan(10);

select has_function(
  'public',
  'request_producer_payout',
  array['uuid', 'bigint', 'text'],
  'public producer payout RPC exists'
);

select has_function(
  'app_private',
  'request_producer_payout',
  array['uuid', 'bigint', 'text'],
  'private producer payout implementation exists'
);

select ok(
  (
    select p.prosecdef
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'request_producer_payout'
      and pg_get_function_identity_arguments(p.oid) = 'target_method_id uuid, requested_amount_cents bigint, requested_currency text'
  ),
  'public producer payout RPC is SECURITY DEFINER'
);

select is(
  (
    select p.proconfig::text
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'request_producer_payout'
      and pg_get_function_identity_arguments(p.oid) = 'target_method_id uuid, requested_amount_cents bigint, requested_currency text'
  ),
  '{"search_path=public, app_private, pg_temp"}',
  'public producer payout RPC has a fixed search_path'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.request_producer_payout(uuid,bigint,text)',
    'EXECUTE'
  ),
  'authenticated can execute the public producer payout RPC'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.request_producer_payout(uuid,bigint,text)',
    'EXECUTE'
  ),
  'anon cannot execute the public producer payout RPC'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'app_private.request_producer_payout(uuid,bigint,text)',
    'EXECUTE'
  ),
  'authenticated cannot execute the private implementation directly'
);

select ok(
  has_function_privilege(
    'service_role',
    'app_private.request_producer_payout(uuid,bigint,text)',
    'EXECUTE'
  ),
  'service_role can execute the private implementation'
);

select ok(
  not has_schema_privilege('authenticated', 'app_private', 'USAGE'),
  'authenticated has no usage on the private schema'
);

select ok(
  has_schema_privilege('service_role', 'app_private', 'USAGE'),
  'service_role has usage on the private schema'
);

select * from finish();
rollback;
