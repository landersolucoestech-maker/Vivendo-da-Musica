begin;

do $$
declare
  current_data_type text;
  course_order_trigger record;
  trigger_definitions text[] := array[]::text[];
  trigger_definition text;
begin
  select columns.data_type
  into current_data_type
  from information_schema.columns
  where columns.table_schema = 'public'
    and columns.table_name = 'course_orders'
    and columns.column_name = 'status';

  if current_data_type = 'USER-DEFINED' then
    for course_order_trigger in
      select
        trigger_definition.tgname as trigger_name,
        pg_get_triggerdef(trigger_definition.oid, true) as definition
      from pg_trigger trigger_definition
      join pg_class relation on relation.oid = trigger_definition.tgrelid
      join pg_namespace relation_schema on relation_schema.oid = relation.relnamespace
      where not trigger_definition.tgisinternal
        and relation_schema.nspname = 'public'
        and relation.relname = 'course_orders'
      order by trigger_definition.tgname
    loop
      trigger_definitions := array_append(trigger_definitions, course_order_trigger.definition);
      execute format(
        'drop trigger %I on public.course_orders',
        course_order_trigger.trigger_name
      );
    end loop;

    alter table public.course_orders
      alter column status drop default;

    alter table public.course_orders
      alter column status type text
      using status::text;

    alter table public.course_orders
      alter column status set default 'pending'::text;

    foreach trigger_definition in array trigger_definitions
    loop
      execute trigger_definition;
    end loop;
  end if;
end;
$$;

comment on column public.course_orders.status is
  'Legacy course order status normalized to text for canonical commerce reconciliation.';

commit;
