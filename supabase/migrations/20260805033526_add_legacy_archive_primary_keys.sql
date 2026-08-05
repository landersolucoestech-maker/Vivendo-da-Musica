-- Archived reconciliation tables exist only when a historical repair produced
-- them. Keep the namespace available in clean environments, and add stable row
-- identity only to archive tables that are actually present.

create schema if not exists legacy_archive;

do $$
declare
  archive_definition record;
  archive_table regclass;
begin
  for archive_definition in
    select *
    from (
      values
        (
          'admin_audit_logs_before_bigint_rekey',
          'id',
          'admin_audit_logs_before_bigint_rekey_pkey',
          false
        ),
        (
          'aulas_before_canonical_reconciliation',
          'id',
          'aulas_before_canonical_reconciliation_pkey',
          false
        ),
        (
          'modulos_before_canonical_reconciliation',
          'id',
          'modulos_before_canonical_reconciliation_pkey',
          false
        ),
        (
          'progresso_aulas_before_canonical_reconciliation',
          'id',
          'progresso_aulas_before_canonical_reconciliation_pkey',
          false
        ),
        (
          'supabase_migration_history_before_canonical_reconciliation',
          'version',
          'supabase_migration_history_before_canonical_reconciliation_pkey',
          false
        ),
        (
          'community_group_members_before_id_removal',
          'archive_id',
          'community_group_members_before_id_removal_pkey',
          true
        ),
        (
          'coupon_redemptions_before_order_reference_removal',
          'archive_id',
          'coupon_redemptions_before_order_reference_removal_pkey',
          true
        ),
        (
          'lesson_files_before_aula_id_removal',
          'archive_id',
          'lesson_files_before_aula_id_removal_pkey',
          true
        )
    ) as definition(
      table_name,
      primary_column,
      constraint_name,
      synthetic_identity
    )
  loop
    archive_table := to_regclass(
      format('legacy_archive.%I', archive_definition.table_name)
    );

    if archive_table is null then
      continue;
    end if;

    if archive_definition.synthetic_identity then
      if not exists (
        select 1
        from pg_attribute column_row
        where column_row.attrelid = archive_table
          and column_row.attname = archive_definition.primary_column
          and not column_row.attisdropped
      ) then
        execute format(
          'alter table %s add column %I bigint generated always as identity',
          archive_table,
          archive_definition.primary_column
        );
      end if;
    else
      execute format(
        'alter table %s alter column %I set not null',
        archive_table,
        archive_definition.primary_column
      );
    end if;

    if not exists (
      select 1
      from pg_constraint primary_key
      where primary_key.conrelid = archive_table
        and primary_key.contype = 'p'
    ) then
      execute format(
        'alter table %s add constraint %I primary key (%I)',
        archive_table,
        archive_definition.constraint_name,
        archive_definition.primary_column
      );
    end if;
  end loop;
end;
$$;
