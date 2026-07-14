alter table public.course_order_items
  add column paid_at timestamptz;

update public.course_order_items coi
set paid_at = coalesce(co.paid_at, co.updated_at)
from public.course_orders co
where co.id = coi.order_id
  and co.status = 'paid';

create index course_order_items_course_paid_idx
  on public.course_order_items (course_id, paid_at desc)
  where paid_at is not null;

create or replace function public.sync_course_order_item_payment_snapshot()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update public.course_order_items
  set paid_at = case
    when new.status = 'paid' then coalesce(new.paid_at, new.updated_at, now())
    else null
  end
  where order_id = new.id;
  return new;
end;
$$;

revoke all on function public.sync_course_order_item_payment_snapshot() from public, anon, authenticated;

create trigger sync_course_order_item_payment_after_order_change
  after insert or update of status, paid_at on public.course_orders
  for each row execute function public.sync_course_order_item_payment_snapshot();
