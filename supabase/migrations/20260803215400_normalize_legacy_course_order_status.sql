begin;

do $$
declare
  current_data_type text;
  had_paid_order_trigger boolean;
begin
  select columns.data_type
  into current_data_type
  from information_schema.columns
  where columns.table_schema = 'public'
    and columns.table_name = 'course_orders'
    and columns.column_name = 'status';

  select exists (
    select 1
    from pg_trigger trigger_definition
    join pg_class relation on relation.oid = trigger_definition.tgrelid
    join pg_namespace relation_schema on relation_schema.oid = relation.relnamespace
    where not trigger_definition.tgisinternal
      and relation_schema.nspname = 'public'
      and relation.relname = 'course_orders'
      and trigger_definition.tgname = 'grant_enrollments_after_paid_order'
  )
  into had_paid_order_trigger;

  if current_data_type = 'USER-DEFINED' then
    if had_paid_order_trigger then
      drop trigger grant_enrollments_after_paid_order on public.course_orders;
    end if;

    alter table public.course_orders
      alter column status drop default;

    alter table public.course_orders
      alter column status type text
      using status::text;

    alter table public.course_orders
      alter column status set default 'pending'::text;

    if had_paid_order_trigger then
      create trigger grant_enrollments_after_paid_order
        after insert or update of status on public.course_orders
        for each row execute function public.grant_enrollments_after_paid_order();
    end if;
  end if;
end;
$$;

comment on column public.course_orders.status is
  'Legacy course order status normalized to text for canonical commerce reconciliation.';

commit;
