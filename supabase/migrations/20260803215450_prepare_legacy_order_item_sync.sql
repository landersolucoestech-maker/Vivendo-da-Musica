begin;

alter table public.course_order_items add column if not exists paid_at timestamptz;
alter table public.digital_product_order_items add column if not exists paid_at timestamptz;
alter table public.beat_order_items add column if not exists paid_at timestamptz;

update public.course_order_items item
set paid_at = orders.paid_at
from public.course_orders orders
where orders.id = item.order_id
  and item.paid_at is null;

update public.digital_product_order_items item
set paid_at = orders.paid_at
from public.digital_product_orders orders
where orders.id = item.order_id
  and item.paid_at is null;

update public.beat_order_items item
set paid_at = orders.paid_at
from public.beat_orders orders
where orders.id = item.order_id
  and item.paid_at is null;

commit;
