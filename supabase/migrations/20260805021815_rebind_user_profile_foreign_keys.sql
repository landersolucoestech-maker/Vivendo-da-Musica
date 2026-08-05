-- Rebind foreign keys that PostgreSQL attached to the legacy duplicate unique
-- constraint during a clean migration replay. Dependencies are recreated only
-- after the legacy constraint is removed, forcing them to use the canonical
-- user_profiles_user_id_unique index.

do $$
declare
  legacy_constraint_oid oid;
  legacy_index_oid oid;
  canonical_constraint_oid oid;
  dependent_foreign_keys jsonb;
  foreign_key jsonb;
begin
  select constraint_row.oid, constraint_row.conindid
  into legacy_constraint_oid, legacy_index_oid
  from pg_constraint as constraint_row
  where constraint_row.conrelid = 'public.user_profiles'::regclass
    and constraint_row.conname = 'user_profiles_user_id_key'
    and constraint_row.contype = 'u';

  if legacy_constraint_oid is null then
    return;
  end if;

  select constraint_row.oid
  into canonical_constraint_oid
  from pg_constraint as constraint_row
  where constraint_row.conrelid = 'public.user_profiles'::regclass
    and constraint_row.conname = 'user_profiles_user_id_unique'
    and constraint_row.contype = 'u';

  if canonical_constraint_oid is null then
    raise exception 'canonical constraint user_profiles_user_id_unique is missing';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'schema_name', table_schema.nspname,
        'table_name', dependent_table.relname,
        'constraint_name', foreign_key_constraint.conname,
        'definition', pg_get_constraintdef(foreign_key_constraint.oid, true)
      )
      order by table_schema.nspname, dependent_table.relname, foreign_key_constraint.conname
    ),
    '[]'::jsonb
  )
  into dependent_foreign_keys
  from pg_constraint as foreign_key_constraint
  join pg_class as dependent_table
    on dependent_table.oid = foreign_key_constraint.conrelid
  join pg_namespace as table_schema
    on table_schema.oid = dependent_table.relnamespace
  where foreign_key_constraint.contype = 'f'
    and foreign_key_constraint.conindid = legacy_index_oid;

  for foreign_key in
    select value
    from jsonb_array_elements(dependent_foreign_keys)
  loop
    execute format(
      'alter table %I.%I drop constraint %I',
      foreign_key ->> 'schema_name',
      foreign_key ->> 'table_name',
      foreign_key ->> 'constraint_name'
    );
  end loop;

  alter table public.user_profiles
    drop constraint user_profiles_user_id_key;

  for foreign_key in
    select value
    from jsonb_array_elements(dependent_foreign_keys)
  loop
    execute format(
      'alter table %I.%I add constraint %I %s',
      foreign_key ->> 'schema_name',
      foreign_key ->> 'table_name',
      foreign_key ->> 'constraint_name',
      foreign_key ->> 'definition'
    );
  end loop;
end;
$$;
