begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

select ok(
  not has_schema_privilege('anon', 'legacy_archive', 'USAGE'),
  'anon cannot use the legacy archive schema'
);

select ok(
  not has_schema_privilege('authenticated', 'legacy_archive', 'USAGE'),
  'authenticated cannot use the legacy archive schema'
);

select ok(
  case
    when to_regprocedure('legacy_archive.lzss_decompress(bytea)') is null
      then true
    else not has_function_privilege(
      'anon',
      to_regprocedure('legacy_archive.lzss_decompress(bytea)'),
      'EXECUTE'
    )
  end,
  'anon cannot execute the optional archive decompression helper'
);

select ok(
  case
    when to_regprocedure('legacy_archive.lzss_decompress(bytea)') is null
      then true
    else not has_function_privilege(
      'authenticated',
      to_regprocedure('legacy_archive.lzss_decompress(bytea)'),
      'EXECUTE'
    )
  end,
  'authenticated cannot execute the optional archive decompression helper'
);

select ok(
  case
    when to_regprocedure('legacy_archive.lzss_decompress(bytea)') is null
      then true
    else not has_function_privilege(
      'service_role',
      to_regprocedure('legacy_archive.lzss_decompress(bytea)'),
      'EXECUTE'
    )
  end,
  'service role cannot execute the optional archive decompression helper'
);

select is(
  (
    select count(*)::bigint
    from information_schema.role_table_grants
    where table_schema = 'legacy_archive'
      and grantee in ('anon', 'authenticated', 'service_role')
  ),
  0::bigint,
  'API roles have no direct archive table privileges'
);

select * from finish();
rollback;
