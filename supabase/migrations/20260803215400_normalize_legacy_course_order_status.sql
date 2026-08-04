begin;

do $$
declare
  target_table text;
  current_data_type text;
  order_trigger record;
  trigger_definitions text[];
  trigger_definition text;
begin
  foreach target_table in array array[
    'course_orders',
    'digital_product_orders',
    'beat_orders'
  ]
  loop
    select columns.data_type
    into current_data_type
    from information_schema.columns
    where columns.table_schema = 'public'
      and columns.table_name = target_table
      and columns.column_name = 'status';

    if current_data_type = 'USER-DEFINED' then
      trigger_definitions := array[]::text[];

      for order_trigger in
        select
          trigger_definition.tgname as trigger_name,
          pg_get_triggerdef(trigger_definition.oid, true) as definition
        from pg_trigger trigger_definition
        join pg_class relation on relation.oid = trigger_definition.tgrelid
        join pg_namespace relation_schema on relation_schema.oid = relation.relnamespace
        where not trigger_definition.tgisinternal
          and relation_schema.nspname = 'public'
          and relation.relname = target_table
        order by trigger_definition.tgname
      loop
        trigger_definitions := array_append(trigger_definitions, order_trigger.definition);
        execute format(
          'drop trigger %I on public.%I',
          order_trigger.trigger_name,
          target_table
        );
      end loop;

      execute format(
        'alter table public.%I alter column status drop default',
        target_table
      );

      execute format(
        'alter table public.%I alter column status type text using status::text',
        target_table
      );

      execute format(
        'alter table public.%I alter column status set default %L::text',
        target_table,
        'pending'
      );

      foreach trigger_definition in array trigger_definitions
      loop
        execute trigger_definition;
      end loop;
    end if;
  end loop;
end;
$$;

comment on column public.course_orders.status is
  'Legacy course order status normalized to text for canonical commerce reconciliation.';
comment on column public.digital_product_orders.status is
  'Legacy digital product order status normalized to text for canonical commerce reconciliation.';
comment on column public.beat_orders.status is
  'Legacy beat order status normalized to text for canonical commerce reconciliation.';

commit;
