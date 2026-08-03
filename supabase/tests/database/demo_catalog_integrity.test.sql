begin;

select plan(15);

select is(
  (
    select count(*)
    from public.courses as course
    where course.is_demo = true
      and course.status = 'published'
      and not exists (
        select 1
        from public.course_modules as module
        where module.course_id = course.id
      )
  ),
  0::bigint,
  'every published demo course has at least one module'
);

select is(
  (
    select count(*)
    from public.course_modules as module
    join public.courses as course on course.id = module.course_id
    where course.is_demo = true
      and not exists (
        select 1
        from public.lessons as lesson
        where lesson.module_id = module.id
      )
  ),
  0::bigint,
  'every demo course module has at least one lesson'
);

select is(
  (
    select count(*)
    from public.courses as course
    where course.is_demo = true
      and course.status = 'published'
      and not exists (
        select 1
        from public.course_modules as module
        join public.lessons as lesson on lesson.module_id = module.id
        where module.course_id = course.id
          and lesson.status = 'published'
      )
  ),
  0::bigint,
  'every published demo course has at least one published lesson'
);

select is(
  (
    select count(*)
    from public.seller_products as product
    where product.is_demo = true
      and product.status = 'published'
      and not exists (
        select 1
        from public.seller_product_files as file
        where file.product_id = product.id
      )
  ),
  0::bigint,
  'every published demo digital product has at least one delivery file'
);

select is(
  (
    select count(*)
    from public.beats as beat
    where beat.is_demo = true
      and beat.status = 'published'
      and not exists (
        select 1
        from public.beat_licenses as license
        where license.beat_id = beat.id
          and license.available = true
      )
  ),
  0::bigint,
  'every published demo beat has at least one available license'
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
    where orders.is_demo = true
      and orders.amount_cents <> coalesce(items.total, 0)
  ),
  0::bigint,
  'demo course order totals equal their item totals'
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
    where orders.is_demo = true
      and orders.amount_cents <> coalesce(items.total, 0)
  ),
  0::bigint,
  'demo digital product order totals equal their item totals'
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
    where orders.is_demo = true
      and orders.amount_cents <> coalesce(items.total, 0)
  ),
  0::bigint,
  'demo beat order totals equal their item totals'
);

select is(
  (
    select count(*)
    from public.beat_order_items as item
    join public.beats as beat on beat.id = item.beat_id
    join public.beat_licenses as license on license.id = item.license_id
    where beat.is_demo = true
      and item.beat_id <> license.beat_id
  ),
  0::bigint,
  'every demo beat order item references a license belonging to the same beat'
);

select is(
  (
    select count(*)
    from public.beat_order_items as item
    join public.beats as beat on beat.id = item.beat_id
    where beat.is_demo = true
      and item.status::text = 'paid'
      and not exists (
        select 1
        from public.beat_license_purchases as purchase
        where purchase.beat_order_item_id = item.id
      )
  ),
  0::bigint,
  'every paid demo beat item has an issued license purchase'
);

select is(
  (
    select count(*)
    from public.beat_license_purchases as purchase
    join public.beats as beat on beat.id = purchase.beat_id
    where purchase.status::text = 'active'
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

select is(
  (
    select count(*)
    from public.opportunities as opportunity
    where opportunity.application_count <> (
      select count(*)
      from public.opportunity_applications as application
      where application.opportunity_id = opportunity.id
        and application.status::text <> 'withdrawn'
    )
  ),
  0::bigint,
  'opportunity application counters match active application records'
);

select is(
  (
    select count(*)
    from public.community_groups as community_group
    where community_group.member_count <> (
      select count(*)
      from public.community_group_members as member
      where member.group_id = community_group.id
    )
  ),
  0::bigint,
  'community group member counters match membership records'
);

select is(
  (
    select count(*)
    from public.community_posts as post
    where post.like_count <> (
      select count(*)
      from public.community_post_likes as post_like
      where post_like.post_id = post.id
    )
  ),
  0::bigint,
  'community post like counters match like records'
);

select is(
  (
    select count(*)
    from public.affiliate_links as link
    where link.conversions_count <> (
      select count(*)
      from public.affiliate_conversions as conversion
      where conversion.affiliate_link_id = link.id
    )
  ),
  0::bigint,
  'affiliate link conversion counters match conversion records'
);

select * from finish();
rollback;
