begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

select ok(
  has_table_privilege('anon', 'public.admin_audit_logs', 'SELECT'),
  'anon retains demo audit-log read access'
);

select ok(
  not has_table_privilege('anon', 'public.admin_audit_logs', 'INSERT'),
  'anon cannot insert audit logs directly'
);

select ok(
  has_table_privilege('authenticated', 'public.admin_audit_logs', 'INSERT'),
  'authenticated staff flow retains audit-log insert privilege'
);

select ok(
  not has_table_privilege('authenticated', 'public.admin_audit_logs', 'UPDATE'),
  'authenticated cannot update audit logs directly'
);

select ok(
  not has_sequence_privilege('anon', 'public.admin_audit_logs_id_seq', 'USAGE'),
  'anon cannot consume audit-log identifiers'
);

select is(
  (
    select count(*)::bigint
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in (
        'observability_health_checks',
        'observability_metric_samples',
        'observability_request_traces'
      )
      and grantee = 'anon'
  ),
  0::bigint,
  'anon has no observability table privileges'
);

select is(
  (
    select count(*)::bigint
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in (
        'observability_health_checks',
        'observability_metric_samples',
        'observability_request_traces'
      )
      and grantee = 'authenticated'
      and privilege_type <> 'SELECT'
  ),
  0::bigint,
  'authenticated observability access is read-only'
);

select ok(
  has_table_privilege('authenticated', 'public.observability_health_checks', 'SELECT'),
  'authenticated staff can read health checks subject to RLS'
);

select is(
  (
    select count(*)::bigint
    from information_schema.role_usage_grants
    where object_schema = 'public'
      and object_name in (
        'observability_health_checks_id_seq',
        'observability_metric_samples_id_seq',
        'observability_request_traces_id_seq'
      )
      and grantee in ('anon', 'authenticated')
  ),
  0::bigint,
  'client roles cannot consume observability sequences'
);

select ok(
  has_sequence_privilege('service_role', 'public.observability_request_traces_id_seq', 'USAGE'),
  'service role retains observability ingestion sequence access'
);

select * from finish();
rollback;
