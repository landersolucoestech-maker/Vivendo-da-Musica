begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

select has_table('public', 'ledger_entries', 'financial ledger exists');
select has_table('public', 'beat_license_purchases', 'beat license contracts exist');
select has_table('public', 'observability_request_traces', 'request traces exist');
select has_table('public', 'webhook_receipts', 'webhook receipts exist');
select ok((select relrowsecurity from pg_class where oid = 'public.ledger_entries'::regclass), 'financial ledger has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.beat_license_purchases'::regclass), 'license contracts have RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.observability_request_traces'::regclass), 'request traces have RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.webhook_receipts'::regclass), 'webhook receipts have RLS');
select has_function('public', 'consume_api_rate_limit', array['text','text','integer','integer'], 'rate-limit RPC exists');
select has_function('public', 'record_api_observation', array['uuid','uuid','text','text','text','integer','integer','text'], 'trace RPC exists');
select ok(not has_function_privilege('anon', 'public.consume_api_rate_limit(text,text,integer,integer)', 'EXECUTE'), 'anon cannot execute rate limit RPC');
select ok(not has_function_privilege('authenticated', 'public.record_api_observation(uuid,uuid,text,text,text,integer,integer,text)', 'EXECUTE'), 'authenticated cannot forge traces');

select * from finish();
rollback;
