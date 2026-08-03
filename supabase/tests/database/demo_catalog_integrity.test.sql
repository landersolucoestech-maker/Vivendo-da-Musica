begin;

select plan(11);

select is(
  (
    select count(*)
    from public.courses as course
    where course.status = 'published'
      and not exists (
        select 1
        from public.course_modules as module
        where module.course_id = course.id
      )
  ),
  0::bigint,
  'every published course has at least one module'
);

select is(
  (
    select count(*)
    from public.course_modules as module
    where not exists (
      select 1
      from public.lessons as lesson
      where lesson.module_id = module.id
    )
  ),
  0::bigint,
  'every course module has at least one lesson'
);

select is(
  (
    select count(*)
    from public.courses as course
    where course.status = 'published'
      and not exists (
        select 1
        from public.course_modules as module
        join public.lessons as lesson on lesson.module_id = module.id
        where module.course_id = course.id
          and lesson.status = 'published'
      )
  ),
  0::bigint,
  'every published course has at least one published lesson'
);

select is(
  (
    select count(*)
    from public.seller_products as product
    where product.status = 'published'
      and not exists (
        select 1
        from public.seller_product_files as file
        where file.product_id = product.id
      )
  ),
  0::bigint,
  'every published digital product has at least one delivery file'
);

select is(
  (
    select count(*)
    from public.beats as beat
    where beat.status = 'published'
      and not exists (
        select 1
        from public.beat_licenses as license
        where license.beat_id = beat.id
          and license.available = true
      )
  ),
  0::bigint,
  'every published beat has at least one available license'
);

select is(
  (
    select count(*)
    from public.course_orders as orders
    left join (
      select order_id, sum(amount_cents)::bigint as total
      from public.course_order_items
      group by order_id
    ) as items on items.order_id = orders.id
    where orders.amount_cents <> coalesce(items.total, 0)
  ),
  0::bigint,
  'course order totals equal their item totals'
);

select is(
  (
    select count(*)
    from public.digital_product_orders as orders
    left join (
      select order_id, sum(amount_cents)::bigint as total
      from public.digital_product_order_items
      group by order_id
    ) as items on items.order_id = orders.id
    where orders.amount_cents <> coalesce(items.total, 0)
  ),
  0::bigint,
  'digital product order totals equal their item totals'
);

select is(
  (
    select count(*)
    from public.beat_orders as orders
    left join (
      select order_id, sum(amount_cents)::bigint as total
      from public.beat_order_items
      group by order_id
    ) as items on items.order_id = orders.id
    where orders.amount_cents <> coalesce(items.total, 0)
  ),
  0::bigint,
  'beat order totals equal their item totals'
);

select is(
  (
    select count(*)
    from public.beat_order_items as item
    join public.beat_licenses as license on license.id = item.license_id
    where item.beat_id <> license.beat_id
  ),
  0::bigint,
  'every beat order item references a license belonging to the same beat'
);

select is(
  (
    select count(*)
    from public.beat_order_items as item
    where item.status = 'paid'
      and not exists (
        select 1
        from public.beat_license_purchases as purchase
        where purchase.beat_order_item_id = item.id
      )
  ),
  0::bigint,
  'every paid beat item has an issued license purchase'
);

select is(
  (
    select count(*)
    from public.beat_license_purchases as purchase
    join public.beats as beat on beat.id = purchase.beat_id
    where purchase.status = 'active'
      and beat.is_demo = true
      and not exists (
        select 1
        from public.beat_deliveries as delivery
        where delivery.purchase_id = purchase.id
      )
  ),
  0::bigint,
  'every active demo beat purchase has a delivery record'
);

select * from finish();
rollback;
