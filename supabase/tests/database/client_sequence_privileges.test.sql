begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

select is(
  (
    select count(*)::bigint
    from pg_class sequence_row
    join pg_namespace schema_row on schema_row.oid = sequence_row.relnamespace
    where schema_row.nspname = 'public'
      and sequence_row.relkind = 'S'
      and has_sequence_privilege(
        'anon',
        format('%I.%I', schema_row.nspname, sequence_row.relname),
        'USAGE'
      )
  ),
  0::bigint,
  'anon has no sequence usage privileges'
);

select is(
  (
    select count(*)::bigint
    from pg_class sequence_row
    join pg_namespace schema_row on schema_row.oid = sequence_row.relnamespace
    where schema_row.nspname = 'public'
      and sequence_row.relkind = 'S'
      and (
        has_sequence_privilege(
          'authenticated',
          format('%I.%I', schema_row.nspname, sequence_row.relname),
          'SELECT'
        )
        or has_sequence_privilege(
          'authenticated',
          format('%I.%I', schema_row.nspname, sequence_row.relname),
          'UPDATE'
        )
      )
  ),
  0::bigint,
  'authenticated cannot inspect or mutate sequence state'
);

select ok(
  has_sequence_privilege('authenticated', 'public.admin_audit_logs_id_seq', 'USAGE'),
  'authenticated retains audit-log sequence usage'
);

select is(
  (
    select count(*)::bigint
    from pg_class sequence_row
    join pg_namespace schema_row on schema_row.oid = sequence_row.relnamespace
    where schema_row.nspname = 'public'
      and sequence_row.relkind = 'S'
      and has_sequence_privilege(
        'authenticated',
        format('%I.%I', schema_row.nspname, sequence_row.relname),
        'USAGE'
      )
  ),
  1::bigint,
  'authenticated sequence usage is limited to the audit-log flow'
);

select is(
  (
    select count(*)::bigint
    from pg_default_acl default_acl
    join pg_roles owner_role on owner_role.oid = default_acl.defaclrole
    join pg_namespace namespace on namespace.oid = default_acl.defaclnamespace
    cross join lateral aclexplode(default_acl.defaclacl) expanded_acl
    join pg_roles grantee_role on grantee_role.oid = expanded_acl.grantee
    where namespace.nspname = 'public'
      and owner_role.rolname = 'postgres'
      and default_acl.defaclobjtype = 'S'
      and grantee_role.rolname in ('anon', 'authenticated')
  ),
  0::bigint,
  'postgres sequence defaults grant no client privileges'
);

select * from finish();
rollback;
