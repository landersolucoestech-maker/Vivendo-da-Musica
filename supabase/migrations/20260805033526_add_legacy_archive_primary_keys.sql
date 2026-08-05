-- Archived reconciliation tables are immutable operational evidence, but they
-- still need stable row identity for efficient inspection and maintenance.
-- Reuse complete unique legacy identifiers where available. JSON snapshots do
-- not expose a natural identifier, so receive a synthetic archive-only key.

alter table legacy_archive.admin_audit_logs_before_bigint_rekey
  alter column id set not null,
  add constraint admin_audit_logs_before_bigint_rekey_pkey primary key (id);

alter table legacy_archive.aulas_before_canonical_reconciliation
  alter column id set not null,
  add constraint aulas_before_canonical_reconciliation_pkey primary key (id);

alter table legacy_archive.modulos_before_canonical_reconciliation
  alter column id set not null,
  add constraint modulos_before_canonical_reconciliation_pkey primary key (id);

alter table legacy_archive.progresso_aulas_before_canonical_reconciliation
  alter column id set not null,
  add constraint progresso_aulas_before_canonical_reconciliation_pkey primary key (id);

alter table legacy_archive.supabase_migration_history_before_canonical_reconciliation
  alter column version set not null,
  add constraint supabase_migration_history_before_canonical_reconciliation_pkey primary key (version);

alter table legacy_archive.community_group_members_before_id_removal
  add column archive_id bigint generated always as identity,
  add constraint community_group_members_before_id_removal_pkey primary key (archive_id);

alter table legacy_archive.coupon_redemptions_before_order_reference_removal
  add column archive_id bigint generated always as identity,
  add constraint coupon_redemptions_before_order_reference_removal_pkey primary key (archive_id);

alter table legacy_archive.lesson_files_before_aula_id_removal
  add column archive_id bigint generated always as identity,
  add constraint lesson_files_before_aula_id_removal_pkey primary key (archive_id);
