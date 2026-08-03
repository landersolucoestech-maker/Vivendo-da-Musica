-- Every published marketplace beat must expose at least one purchasable license.
-- Reconcile the historical Noite Roxa demo fixture without relying on a fixed
-- generated license id.

with target_beat as (
  select id
  from public.beats
  where slug = 'noite-roxa'
    and is_demo = true
  limit 1
), licenses(license_type, name, price_cents, deliverables, usage_rights, is_exclusive) as (
  values
    (
      'basic'::text,
      'Licença Básica'::text,
      9900,
      '["MP3"]'::jsonb,
      '["Até 10.000 streams", "Shows sem limite"]'::jsonb,
      false
    ),
    (
      'premium'::text,
      'Licença Premium'::text,
      19900,
      '["MP3", "WAV"]'::jsonb,
      '["Até 100.000 streams", "Monetização", "Videoclipes"]'::jsonb,
      false
    ),
    (
      'exclusive'::text,
      'Licença Exclusiva'::text,
      149900,
      '["MP3", "WAV", "Stems"]'::jsonb,
      '["Uso comercial exclusivo", "Streams ilimitados"]'::jsonb,
      true
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
