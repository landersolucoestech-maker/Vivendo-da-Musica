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

-- Seed the demo order only when the synthetic user is compatible with the active
-- course_orders FK. Historical rebuilds reference auth.users; the current dev
-- branch references the synthetic user_profiles domain.
do $$
declare
  v_course public.courses%rowtype;
  v_order_id uuid;
  v_demo_user_id constant uuid := '11111111-1111-4111-8111-111111111111'::uuid;
  v_requires_auth_user boolean;
  v_user_is_compatible boolean;
begin
  select exists (
    select 1
    from pg_constraint constraint_row
    join pg_class source_table on source_table.oid=constraint_row.conrelid
    join pg_namespace source_schema on source_schema.oid=source_table.relnamespace
    join pg_class target_table on target_table.oid=constraint_row.confrelid
    join pg_namespace target_schema on target_schema.oid=target_table.relnamespace
    where constraint_row.contype='f'
      and source_schema.nspname='public'
      and source_table.relname='course_orders'
      and target_schema.nspname='auth'
      and target_table.relname='users'
  ) into v_requires_auth_user;

  select case
    when v_requires_auth_user then exists (
      select 1 from auth.users auth_user where auth_user.id=v_demo_user_id
    )
    else exists (
      select 1 from public.user_profiles profile where profile.user_id=v_demo_user_id
    )
  end into v_user_is_compatible;

  if not v_user_is_compatible then
    return;
  end if;

  select * into v_course
  from public.courses
  order by created_at
  limit 1;

  if v_course.id is not null
     and not exists (
       select 1
       from public.course_orders
       where user_id=v_demo_user_id
         and is_demo
     ) then
    insert into public.course_orders(
      user_id,status,provider,amount_cents,currency,is_demo,paid_at,created_at
    ) values (
      v_demo_user_id,
      'paid',
      'development',
      v_course.price_cents,
      v_course.currency,
      true,
      now()-interval '10 days',
      now()-interval '10 days'
    )
    returning id into v_order_id;

    insert into public.course_order_items(
      order_id,course_id,course_title_snapshot,amount_cents,currency
    ) values (
      v_order_id,
      v_course.id,
      v_course.title,
      v_course.price_cents,
      v_course.currency
    );
  end if;
end $$;
