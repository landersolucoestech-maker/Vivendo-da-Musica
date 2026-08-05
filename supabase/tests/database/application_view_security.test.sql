begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

select is(
  (
    select count(*)::bigint
    from pg_class view_row
    join pg_namespace schema_row
      on schema_row.oid = view_row.relnamespace
    where schema_row.nspname in (
        'public',
        'app_private',
        'authz_private',
        'legacy_archive'
      )
      and view_row.relkind = 'v'
      and not (
        'security_invoker=true' = any(
          coalesce(view_row.reloptions, array[]::text[])
        )
      )
  ),
  0::bigint,
  'all application views execute with caller privileges'
);

select ok(
  has_table_privilege(
    'service_role',
    'app_private.legacy_commerce_orders',
    'SELECT'
  ),
  'service role retains legacy order reconciliation access'
);

select ok(
  not has_table_privilege(
    'anon',
    'app_private.legacy_commerce_orders',
    'SELECT'
  )
  and not has_table_privilege(
    'authenticated',
    'app_private.legacy_commerce_order_items',
    'SELECT'
  ),
  'client roles cannot read private legacy commerce views'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
        'Authenticated users can upload lesson projects',
        'Authenticated users can update lesson projects',
        'Authenticated users can delete lesson projects',
        'Authenticated users can upload lesson samples',
        'Authenticated users can update lesson samples',
        'Authenticated users can delete lesson samples'
      )
  ),
  0::bigint,
  'broad legacy lesson asset write policies are removed'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'lesson_assets_owner_insert'
      and cmd = 'INSERT'
      and 'authenticated' = any(roles)
  ),
  1::bigint,
  'owner-scoped lesson asset insert policy remains active'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'lesson_assets_owner_update'
      and cmd = 'UPDATE'
      and 'authenticated' = any(roles)
  ),
  1::bigint,
  'owner-scoped lesson asset update policy remains active'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'lesson_assets_owner_delete'
      and cmd = 'DELETE'
      and 'authenticated' = any(roles)
  ),
  1::bigint,
  'owner-scoped lesson asset delete policy remains active'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
        'Lesson projects are publicly accessible',
        'Lesson samples are publicly accessible'
      )
      and cmd = 'SELECT'
      and 'public' = any(roles)
  ),
  2::bigint,
  'public lesson asset reads remain available'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
        'Users can upload their own avatar',
        'Users can update their own avatar',
        'Users can delete their own avatar'
      )
  ),
  0::bigint,
  'duplicate legacy avatar write policies are removed'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
        'avatars_owner_insert',
        'avatars_owner_update',
        'avatars_owner_delete'
      )
      and 'authenticated' = any(roles)
  ),
  3::bigint,
  'authenticated owner-scoped avatar writes remain active'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'avatars_owner_update'
      and cmd = 'UPDATE'
      and with_check is not null
  ),
  1::bigint,
  'avatar updates validate both source and destination paths'
);

select is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Avatar images are publicly accessible'
      and cmd = 'SELECT'
      and 'public' = any(roles)
  ),
  1::bigint,
  'public avatar reads remain available'
);

select * from finish();
rollback;
