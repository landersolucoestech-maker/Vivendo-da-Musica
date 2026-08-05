begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

select is(
  (
    select count(*)::bigint
    from pg_class as archive_table
    join pg_namespace as archive_schema
      on archive_schema.oid = archive_table.relnamespace
    where archive_schema.nspname = 'legacy_archive'
      and archive_table.relkind = 'r'
      and not exists (
        select 1
        from pg_constraint as primary_key
        where primary_key.conrelid = archive_table.oid
          and primary_key.contype = 'p'
      )
  ),
  0::bigint,
  'every existing legacy archive table has a primary key'
);

select is(
  (
    select count(*)::bigint
    from information_schema.columns
    where table_schema = 'legacy_archive'
      and table_name in (
        'community_group_members_before_id_removal',
        'coupon_redemptions_before_order_reference_removal',
        'lesson_files_before_aula_id_removal'
      )
      and column_name = 'archive_id'
      and is_identity = 'YES'
  ),
  (
    select count(*)::bigint
    from pg_class as archive_table
    join pg_namespace as archive_schema
      on archive_schema.oid = archive_table.relnamespace
    where archive_schema.nspname = 'legacy_archive'
      and archive_table.relkind = 'r'
      and archive_table.relname in (
        'community_group_members_before_id_removal',
        'coupon_redemptions_before_order_reference_removal',
        'lesson_files_before_aula_id_removal'
      )
  ),
  'every existing JSON snapshot archive uses a synthetic identity key'
);

select is(
  (
    select count(*)::bigint
    from pg_constraint as primary_key
    join pg_class as archive_table
      on archive_table.oid = primary_key.conrelid
    join pg_namespace as archive_schema
      on archive_schema.oid = archive_table.relnamespace
    where archive_schema.nspname = 'legacy_archive'
      and primary_key.contype = 'p'
  ),
  (
    select count(*)::bigint
    from pg_class as archive_table
    join pg_namespace as archive_schema
      on archive_schema.oid = archive_table.relnamespace
    where archive_schema.nspname = 'legacy_archive'
      and archive_table.relkind = 'r'
  ),
  'legacy archive table and primary-key counts match'
);

select * from finish();
rollback;
