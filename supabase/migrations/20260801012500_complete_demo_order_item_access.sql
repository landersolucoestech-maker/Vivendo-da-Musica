alter table public.beat_order_items enable row level security;
alter table public.digital_product_order_items enable row level security;

drop policy if exists beat_order_items_buyer_read on public.beat_order_items;
create policy beat_order_items_buyer_read on public.beat_order_items for select to authenticated using (buyer_id=auth.uid());
drop policy if exists digital_product_order_items_buyer_read on public.digital_product_order_items;
create policy digital_product_order_items_buyer_read on public.digital_product_order_items for select to authenticated using (buyer_id=auth.uid());

drop policy if exists demo_beat_order_items_read on public.beat_order_items;
create policy demo_beat_order_items_read on public.beat_order_items for select to anon using (exists(select 1 from public.beat_orders o where o.id=order_id and o.is_demo));
drop policy if exists demo_digital_product_order_items_read on public.digital_product_order_items;
create policy demo_digital_product_order_items_read on public.digital_product_order_items for select to anon using (exists(select 1 from public.digital_product_orders o where o.id=order_id and o.is_demo));

do $$
declare v_course public.courses%rowtype; v_order_id uuid;
begin
  select * into v_course from public.courses order by created_at limit 1;
  if v_course.id is not null and not exists(select 1 from public.course_orders where user_id='11111111-1111-4111-8111-111111111111' and is_demo) then
    insert into public.course_orders(user_id,status,provider,amount_cents,currency,is_demo,paid_at,created_at)
    values('11111111-1111-4111-8111-111111111111','paid','development',v_course.price_cents,v_course.currency,true,now()-interval '10 days',now()-interval '10 days') returning id into v_order_id;
    insert into public.course_order_items(order_id,course_id,course_title_snapshot,amount_cents,currency)
    values(v_order_id,v_course.id,v_course.title,v_course.price_cents,v_course.currency);
  end if;
end $$;
