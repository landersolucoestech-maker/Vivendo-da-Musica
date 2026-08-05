begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

select is(
  (
    select count(*)::bigint
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee = 'anon'
      and privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER')
  ),
  0::bigint,
  'anon has no table DDL or truncate privileges'
);

select is(
  (
    select count(*)::bigint
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee = 'authenticated'
      and privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER')
  ),
  0::bigint,
  'authenticated has no table DDL or truncate privileges'
);

select is(
  (
    select count(*)::bigint
    from pg_class table_row
    join pg_namespace schema_row on schema_row.oid = table_row.relnamespace
    where schema_row.nspname = 'public'
      and table_row.relkind in ('r', 'p', 'v', 'm')
      and (
        has_table_privilege('anon', table_row.oid, 'MAINTAIN')
        or has_table_privilege('authenticated', table_row.oid, 'MAINTAIN')
      )
  ),
  0::bigint,
  'client roles have no table maintain privileges'
);

select ok(
  has_table_privilege('service_role', 'public.commerce_orders', 'TRUNCATE')
  and has_table_privilege('service_role', 'public.commerce_orders', 'REFERENCES')
  and has_table_privilege('service_role', 'public.commerce_orders', 'TRIGGER')
  and has_table_privilege('service_role', 'public.commerce_orders', 'MAINTAIN'),
  'service role retains operational table privileges'
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
      and default_acl.defaclobjtype = 'r'
      and grantee_role.rolname in ('anon', 'authenticated')
      and expanded_acl.privilege_type in (
        'TRUNCATE',
        'REFERENCES',
        'TRIGGER',
        'MAINTAIN'
      )
  ),
  0::bigint,
  'postgres table defaults grant no administrative privileges to clients'
);

select * from finish();
rollback;
