begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      and 'public' = any(roles)
  ),
  0::bigint,
  'no storage mutation policy targets PUBLIC'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      and 'anon' = any(roles)
      and lower(coalesce(qual, '') || ' ' || coalesce(with_check, ''))
          not like '%is_demo%'
  ),
  0::bigint,
  'every anonymous storage mutation is restricted to demo data'
);

select is(
  (
    select array_agg(policyname order by policyname)
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      and 'anon' = any(roles)
  ),
  array[
    'beat_license_contracts_owner_delete',
    'beat_license_contracts_owner_insert',
    'beat_license_contracts_owner_update',
    'lesson_materials_demo_delete',
    'lesson_materials_demo_insert',
    'lesson_videos_demo_delete',
    'lesson_videos_demo_insert',
    'lesson_videos_demo_update'
  ]::text[],
  'anonymous storage mutations are limited to reviewed demo policies'
);

select * from finish();
rollback;
