begin;

do $$
declare
  current_data_type text;
begin
  select columns.data_type
  into current_data_type
  from information_schema.columns
  where columns.table_schema = 'public'
    and columns.table_name = 'course_orders'
    and columns.column_name = 'status';

  if current_data_type = 'USER-DEFINED' then
    alter table public.course_orders
      alter column status drop default;

    alter table public.course_orders
      alter column status type text
      using status::text;

    alter table public.course_orders
      alter column status set default 'pending'::text;
  end if;
end;
$$;

comment on column public.course_orders.status is
  'Legacy course order status normalized to text for canonical commerce reconciliation.';

commit;
