-- Reconcile historical paid demo beat orders with the beat/license they
-- actually reference, then materialize the corresponding license contract and
-- delivery record. This migration is intentionally limited to demo beats.

with target_beat as (
  select id
  from public.beats
  where slug = 'favela-solar'
    and is_demo = true
  limit 1
), licenses(license_type, name, price_cents, deliverables, usage_rights, is_exclusive) as (
  values
    (
      'basic'::text,
      'Licença Básica'::text,
      8900,
      '["MP3"]'::jsonb,
      '["Até 10.000 streams", "Shows sem limite"]'::jsonb,
      false
    ),
    (
      'premium'::text,
      'Licença Premium'::text,
      18900,
      '["MP3", "WAV"]'::jsonb,
      '["Até 150.000 streams", "Monetização", "Videoclipes"]'::jsonb,
      false
    )
)
insert into public.beat_licenses (
  beat_id,
  license_type,
  name,
  price_cents,
  currency,
  deliverables,
  usage_rights,
  is_exclusive,
  available
)
select
  target_beat.id,
  licenses.license_type,
  licenses.name,
  licenses.price_cents,
  'BRL',
  licenses.deliverables,
  licenses.usage_rights,
  licenses.is_exclusive,
  true
from target_beat
cross join licenses
on conflict (beat_id, license_type) do update
set name = excluded.name,
    price_cents = excluded.price_cents,
    currency = excluded.currency,
    deliverables = excluded.deliverables,
    usage_rights = excluded.usage_rights,
    is_exclusive = excluded.is_exclusive,
    available = true,
    updated_at = now();

update public.beat_order_items as item
set license_id = replacement.id,
    license_name_snapshot = replacement.name
from public.beat_licenses as current_license,
     public.beat_licenses as replacement,
     public.beats as beat
where item.license_id = current_license.id
  and item.beat_id = beat.id
  and beat.is_demo = true
  and current_license.beat_id <> item.beat_id
  and replacement.beat_id = item.beat_id
  and replacement.license_type = current_license.license_type
  and replacement.price_cents = item.amount_cents;

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
  'VDM-DEV-' || upper(left(replace(item.id::text, '-', ''), 12)),
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
