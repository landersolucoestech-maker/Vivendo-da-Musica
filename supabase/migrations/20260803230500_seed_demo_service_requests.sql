begin;

insert into public.service_requests (
  client_id,
  category_id,
  title,
  brief,
  budget_min_cents,
  budget_max_cents,
  currency,
  desired_delivery_date,
  status,
  is_demo
)
select
  student.user_id,
  category.id,
  'Mixagem e masterização de single',
  'Preciso de mixagem e masterização para um single de trap com voz principal, dobras, ad-libs e instrumental em stems. A entrega deverá incluir WAV final, instrumental e versão para performance.',
  60000,
  100000,
  'BRL',
  current_date + 20,
  'open',
  true
from public.user_profiles student
cross join public.service_categories category
where student.role = 'student'
  and student.is_demo
  and category.slug = 'mixagem-masterizacao'
  and not exists (
    select 1 from public.service_requests request
    where request.client_id = student.user_id
      and request.title = 'Mixagem e masterização de single'
      and request.is_demo
  )
limit 1;

insert into public.service_proposals (
  request_id,
  provider_id,
  amount_cents,
  currency,
  delivery_days,
  revisions,
  scope,
  deliverables,
  status,
  expires_at
)
select
  request.id,
  provider.user_id,
  85000,
  request.currency,
  10,
  2,
  'Mixagem completa das vozes e do instrumental, tratamento corretivo, automações, masterização para plataformas digitais e preparação das versões adicionais solicitadas.',
  array['WAV 24-bit', 'Instrumental', 'Versão para performance', 'MP3 de referência'],
  'submitted',
  now() + interval '7 days'
from public.service_requests request
cross join public.user_profiles provider
where request.title = 'Mixagem e masterização de single'
  and request.is_demo
  and provider.role = 'producer'
  and provider.is_demo
  and not exists (
    select 1 from public.service_proposals proposal
    where proposal.request_id = request.id
      and proposal.provider_id = provider.user_id
  )
limit 1;

commit;
