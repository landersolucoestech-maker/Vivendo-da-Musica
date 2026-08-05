-- Add deterministic supporting indexes for public-schema foreign keys that
-- have no usable leading-column index. A single-column partial index with
-- `column IS NOT NULL` is considered valid because FK equality probes imply
-- the same predicate and null values do not participate in referential checks.

do $$
declare
  foreign_key record;
  generated_index_name text;
begin
  for foreign_key in
    with foreign_keys as (
      select
        constraint_row.oid as constraint_oid,
        constraint_row.conrelid,
        table_schema.nspname as schema_name,
        dependent_table.relname as table_name,
        constraint_row.conname as constraint_name,
        constraint_row.conkey,
        array(
          select attribute.attname
          from unnest(constraint_row.conkey) with ordinality as key(attnum, position)
          join pg_attribute as attribute
            on attribute.attrelid = dependent_table.oid
           and attribute.attnum = key.attnum
          order by key.position
        ) as columns,
        (
          select string_agg(format('%I', attribute.attname), ', ' order by key.position)
          from unnest(constraint_row.conkey) with ordinality as key(attnum, position)
          join pg_attribute as attribute
            on attribute.attrelid = dependent_table.oid
           and attribute.attnum = key.attnum
        ) as column_sql
      from pg_constraint as constraint_row
      join pg_class as dependent_table
        on dependent_table.oid = constraint_row.conrelid
      join pg_namespace as table_schema
        on table_schema.oid = dependent_table.relnamespace
      where constraint_row.contype = 'f'
        and table_schema.nspname = 'public'
    )
    select candidate.*
    from foreign_keys as candidate
    where not exists (
      select 1
      from pg_index as index_row
      where index_row.indrelid = candidate.conrelid
        and index_row.indisvalid
        and index_row.indisready
        and index_row.indexprs is null
        and array(
          select index_row.indkey[subscript]
          from generate_subscripts(index_row.indkey::smallint[], 1) as subscript
          order by subscript
          limit cardinality(candidate.conkey)
        ) = candidate.conkey
        and (
          index_row.indpred is null
          or (
            cardinality(candidate.conkey) = 1
            and pg_get_expr(index_row.indpred, index_row.indrelid) ilike
              '%' || candidate.columns[1] || ' IS NOT NULL%'
          )
        )
    )
    order by candidate.schema_name, candidate.table_name, candidate.constraint_name
  loop
    generated_index_name :=
      left(regexp_replace(foreign_key.constraint_name, '_fkey$', ''), 46)
      || '_'
      || substr(md5(foreign_key.constraint_name), 1, 8)
      || '_idx';

    execute format(
      'create index if not exists %I on %I.%I (%s)',
      generated_index_name,
      foreign_key.schema_name,
      foreign_key.table_name,
      foreign_key.column_sql
    );
  end loop;
end;
$$;
