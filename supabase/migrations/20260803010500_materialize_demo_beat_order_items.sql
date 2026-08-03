-- The expanded marketplace seed creates four paid demo beat order headers.
-- Materialize the matching line items after every beat and license seed has
-- completed, then issue the corresponding contracts and delivery metadata.

with desired_items (item_id, order_id, beat_slug) as (
  values
    ('ba200000-0000-4000-8000-000000000001'::uuid, 'ba100000-0000-4000-8000-000000000001'::uuid, 'noite-roxa'::text),
    ('ba200000-0000-4000-8000-000000000002'::uuid, 'ba100000-0000-4000-8000-000000000002'::uuid, 'favela-solar'::text),
    ('ba200000-0000-4000-8000-000000000003'::uuid, 'ba100000-0000-4000-8000-000000000003'::uuid, 'skyline-drill'::text),
    ('ba200000-0000-4000-8000-000000000004'::uuid, 'ba100000-0000-4000-8000-000000000004'::uuid, 'rnb-depois-das-duas'::text)
)
insert into public.beat_order_items (
  id,
  order_id,
  beat_id,
  license_id,
  producer_id,
  buyer_id,
  beat_title_snapshot,
  license_name_snapshot,
  buyer_name_snapshot,
  list_price_cents,
  amount_cents,
  currency,
  status,
  paid_at,
  created_at
)
select
  desired.item_id,
  orders.id,
  beat.id,
  license.id,
  beat.producer_id,
  orders.buyer_id,
  beat.title,
  license.name,
  'Aluno Demo',
  license.price_cents,
  license.price_cents,
  orders.currency,
  'paid',
  orders.paid_at,
  orders.created_at
from desired_items as desired
join public.beat_orders as orders on orders.id = desired.order_id
join public.beats as beat
  on beat.slug = desired.beat_slug
 and beat.is_demo = true
join lateral (
  select candidate.id, candidate.name, candidate.price_cents
  from public.beat_licenses as candidate
  where candidate.beat_id = beat.id
    and candidate.license_type::text = 'premium'
    and candidate.available = true
  order by candidate.updated_at desc, candidate.created_at desc, candidate.id
  limit 1
) as license on true
on conflict (id) do update set
  order_id = excluded.order_id,
  beat_id = excluded.beat_id,
  license_id = excluded.license_id,
  producer_id = excluded.producer_id,
  buyer_id = excluded.buyer_id,
  beat_title_snapshot = excluded.beat_title_snapshot,
  license_name_snapshot = excluded.license_name_snapshot,
  buyer_name_snapshot = excluded.buyer_name_snapshot,
  list_price_cents = excluded.list_price_cents,
  amount_cents = excluded.amount_cents,
  currency = excluded.currency,
  status = excluded.status,
  paid_at = excluded.paid_at;

with item_totals as (
  select
    item.order_id,
    sum(item.amount_cents)::bigint as amount_cents
  from public.beat_order_items as item
  group by item.order_id
)
update public.beat_orders as orders
set
  amount_cents = totals.amount_cents,
  updated_at = now()
from item_totals as totals
where orders.id = totals.order_id
  and orders.is_demo = true
  and orders.amount_cents is distinct from totals.amount_cents;

insert into public.beat_license_purchases (
  beat_order_item_id,
  beat_id,
  license_id,
  buyer_id,
  contract_number,
  status,
  issued_at
)
select
  item.id,
  item.beat_id,
  item.license_id,
  item.buyer_id,
  'VDM-DEV-' || upper(right(replace(item.id::text, '-', ''), 12)),
  'active',
  coalesce(item.paid_at, item.created_at, now())
from public.beat_order_items as item
join public.beats as beat on beat.id = item.beat_id
join public.beat_licenses as license
  on license.id = item.license_id
 and license.beat_id = item.beat_id
where item.status = 'paid'
  and beat.is_demo = true
  and not exists (
    select 1
    from public.beat_license_purchases as purchase
    where purchase.beat_order_item_id = item.id
  )
on conflict (beat_order_item_id) do nothing;

insert into public.beat_deliveries (
  purchase_id,
  file_label,
  storage_bucket,
  storage_path,
  expires_at
)
select
  purchase.id,
  'Master WAV',
  'beat-masters',
  beat.producer_id::text || '/' || purchase.beat_id::text || '/master.wav',
  now() + interval '30 days'
from public.beat_license_purchases as purchase
join public.beats as beat on beat.id = purchase.beat_id
where beat.is_demo = true
  and purchase.status = 'active'
  and not exists (
    select 1
    from public.beat_deliveries as delivery
    where delivery.purchase_id = purchase.id
  );
