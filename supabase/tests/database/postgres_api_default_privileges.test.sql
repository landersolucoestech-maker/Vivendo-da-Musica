begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

select is(
  (
    select count(*)::bigint
    from pg_default_acl default_acl
    join pg_roles owner_role on owner_role.oid = default_acl.defaclrole
    join pg_namespace namespace on namespace.oid = default_acl.defaclnamespace
    cross join lateral aclexplode(default_acl.defaclacl) expanded_acl
    left join pg_roles grantee_role on grantee_role.oid = expanded_acl.grantee
    where namespace.nspname = 'public'
      and owner_role.rolname = 'postgres'
      and default_acl.defaclobjtype = 'r'
      and (
        grantee_role.rolname in ('anon', 'authenticated')
        or expanded_acl.grantee = 0
      )
  ),
  0::bigint,
  'postgres table defaults grant no client or PUBLIC privileges'
);

select is(
  (
    select count(*)::bigint
    from pg_default_acl default_acl
    join pg_roles owner_role on owner_role.oid = default_acl.defaclrole
    join pg_namespace namespace on namespace.oid = default_acl.defaclnamespace
    cross join lateral aclexplode(default_acl.defaclacl) expanded_acl
    left join pg_roles grantee_role on grantee_role.oid = expanded_acl.grantee
    where namespace.nspname = 'public'
      and owner_role.rolname = 'postgres'
      and default_acl.defaclobjtype = 'S'
      and (
        grantee_role.rolname in ('anon', 'authenticated')
        or expanded_acl.grantee = 0
      )
  ),
  0::bigint,
  'postgres sequence defaults grant no client or PUBLIC privileges'
);

select is(
  (
    select count(*)::bigint
    from pg_default_acl default_acl
    join pg_roles owner_role on owner_role.oid = default_acl.defaclrole
    join pg_namespace namespace on namespace.oid = default_acl.defaclnamespace
    cross join lateral aclexplode(default_acl.defaclacl) expanded_acl
    left join pg_roles grantee_role on grantee_role.oid = expanded_acl.grantee
    where namespace.nspname = 'public'
      and owner_role.rolname = 'postgres'
      and default_acl.defaclobjtype = 'f'
      and expanded_acl.privilege_type = 'EXECUTE'
      and (
        grantee_role.rolname in ('anon', 'authenticated')
        or expanded_acl.grantee = 0
      )
  ),
  0::bigint,
  'postgres function defaults grant no client or PUBLIC execute'
);

select ok(
  exists (
    select 1
    from pg_default_acl default_acl
    join pg_roles owner_role on owner_role.oid = default_acl.defaclrole
    join pg_namespace namespace on namespace.oid = default_acl.defaclnamespace
    cross join lateral aclexplode(default_acl.defaclacl) expanded_acl
    join pg_roles grantee_role on grantee_role.oid = expanded_acl.grantee
    where namespace.nspname = 'public'
      and owner_role.rolname = 'postgres'
      and grantee_role.rolname = 'service_role'
  ),
  'service role retains explicit default privileges'
);

select * from finish();
rollback;
