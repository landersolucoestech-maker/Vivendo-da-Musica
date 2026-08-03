begin;

insert into public.service_categories (slug, name, description, sort_order) values
  ('producao-musical', 'Produção musical', 'Produção, arranjo, gravação e finalização.', 10),
  ('mixagem-masterizacao', 'Mixagem e masterização', 'Tratamento, mixagem e masterização de áudio.', 20),
  ('design-audiovisual', 'Design e audiovisual', 'Capas, identidade, clipes e conteúdos audiovisuais.', 30),
  ('marketing-musical', 'Marketing musical', 'Estratégia, lançamento e divulgação artística.', 40),
  ('consultoria-direitos', 'Consultoria e direitos', 'Orientação profissional, contratos e direitos musicais.', 50)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order,
    active = true;

insert into public.service_listings (
  provider_id,
  category_id,
  slug,
  title,
  short_description,
  description,
  requirements,
  portfolio_urls,
  status,
  moderation_status,
  is_demo,
  published_at
)
select
  profile.user_id,
  category.id,
  'producao-musical-completa-dev',
  'Produção musical completa',
  'Da ideia à música finalizada.',
  'Produção musical com arranjo, edição, mixagem e entrega final conforme o escopo contratado.',
  array['Referências musicais', 'Arquivos de voz ou guia'],
  array[]::text[],
  'published',
  'approved',
  true,
  now()
from public.user_profiles profile
cross join public.service_categories category
where profile.role = 'producer'
  and profile.is_demo
  and category.slug = 'producao-musical'
limit 1
on conflict (slug) do nothing;

insert into public.service_packages (
  listing_id,
  code,
  name,
  description,
  price_cents,
  currency,
  delivery_days,
  revisions,
  deliverables,
  active,
  sort_order
)
select
  listing.id,
  'COMPLETO',
  'Produção completa',
  'Produção, edição, mixagem e masterização.',
  120000,
  'BRL',
  15,
  2,
  array['WAV master', 'MP3', 'Stems'],
  true,
  10
from public.service_listings listing
where listing.slug = 'producao-musical-completa-dev'
on conflict (listing_id, code) do nothing;

insert into public.commerce_offers (
  resource_type,
  resource_id,
  seller_id,
  title,
  description,
  status,
  currency,
  metadata,
  is_demo
)
select
  'service',
  package.id,
  listing.provider_id,
  listing.title || ' — ' || package.name,
  package.description,
  'active',
  package.currency,
  jsonb_build_object(
    'listingId', listing.id,
    'listingSlug', listing.slug,
    'deliveryDays', package.delivery_days,
    'revisions', package.revisions,
    'deliverables', package.deliverables
  ),
  listing.is_demo
from public.service_packages package
join public.service_listings listing on listing.id = package.listing_id
on conflict (resource_type, resource_id) do update
set seller_id = excluded.seller_id,
    title = excluded.title,
    description = excluded.description,
    status = excluded.status,
    currency = excluded.currency,
    metadata = excluded.metadata,
    is_demo = excluded.is_demo,
    updated_at = now();

insert into public.commerce_offer_prices (
  offer_id,
  version,
  amount_cents,
  currency,
  status,
  effective_from,
  commercial_snapshot,
  published_at
)
select
  offer.id,
  1,
  package.price_cents,
  package.currency,
  'published',
  package.created_at,
  jsonb_build_object('source', 'service_seed'),
  package.created_at
from public.commerce_offers offer
join public.service_packages package
  on offer.resource_type = 'service'
 and offer.resource_id = package.id
where not exists (
  select 1 from public.commerce_offer_prices price
  where price.offer_id = offer.id
);

commit;
