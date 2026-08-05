begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

with foreign_keys as (
  select
    constraint_row.oid as constraint_oid,
    constraint_row.conrelid,
    constraint_row.conkey,
    array(
      select attribute.attname
      from unnest(constraint_row.conkey) with ordinality as key(attnum, position)
      join pg_attribute as attribute
        on attribute.attrelid = constraint_row.conrelid
       and attribute.attnum = key.attnum
      order by key.position
    ) as columns
  from pg_constraint as constraint_row
  join pg_class as dependent_table
    on dependent_table.oid = constraint_row.conrelid
  join pg_namespace as table_schema
    on table_schema.oid = dependent_table.relnamespace
  where constraint_row.contype = 'f'
    and table_schema.nspname = 'public'
), uncovered as (
  select foreign_key.constraint_oid
  from foreign_keys as foreign_key
  where not exists (
    select 1
    from pg_index as index_row
    where index_row.indrelid = foreign_key.conrelid
      and index_row.indisvalid
      and index_row.indisready
      and index_row.indexprs is null
      and array(
        select index_row.indkey[subscript]
        from generate_subscripts(index_row.indkey::smallint[], 1) as subscript
        order by subscript
        limit cardinality(foreign_key.conkey)
      ) = foreign_key.conkey
      and (
        index_row.indpred is null
        or (
          cardinality(foreign_key.conkey) = 1
          and pg_get_expr(index_row.indpred, index_row.indrelid) ilike
            '%' || foreign_key.columns[1] || ' IS NOT NULL%'
        )
      )
  )
)
select is(
  (select count(*)::bigint from uncovered),
  0::bigint,
  'every public foreign key has a usable leading-column index'
);

select is(
  (
    select count(*)::bigint
    from pg_index as index_row
    join pg_class as index_class on index_class.oid = index_row.indexrelid
    join pg_class as table_class on table_class.oid = index_row.indrelid
    join pg_namespace as table_schema on table_schema.oid = table_class.relnamespace
    where table_schema.nspname = 'public'
      and index_class.relname ~ '_[0-9a-f]{8}_idx$'
      and (not index_row.indisvalid or not index_row.indisready)
  ),
  0::bigint,
  'all generated foreign-key indexes are valid and ready'
);

select is(
  (
    select count(*)::bigint
    from pg_constraint as constraint_row
    join pg_class as dependent_table on dependent_table.oid = constraint_row.conrelid
    join pg_namespace as table_schema on table_schema.oid = dependent_table.relnamespace
    where constraint_row.contype = 'f'
      and table_schema.nspname = 'public'
      and constraint_row.conname in (
        'ledger_postings_transaction_id_fkey',
        'commerce_order_items_order_id_fkey',
        'opportunities_credit_event_id_fkey',
        'opportunities_credit_lot_id_fkey'
      )
      and exists (
        select 1
        from pg_index as index_row
        where index_row.indrelid = constraint_row.conrelid
          and index_row.indisvalid
          and index_row.indisready
          and array(
            select index_row.indkey[subscript]
            from generate_subscripts(index_row.indkey::smallint[], 1) as subscript
            order by subscript
            limit cardinality(constraint_row.conkey)
          ) = constraint_row.conkey
      )
  ),
  4::bigint,
  'critical ledger, commerce and opportunity foreign keys are indexed'
);

select * from finish();
rollback;
