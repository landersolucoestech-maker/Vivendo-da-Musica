create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.seller_products(id) on delete cascade,
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text not null check (char_length(btrim(comment)) between 3 and 3000),
  status text not null default 'published' check (status in ('published', 'hidden')),
  seller_response text,
  responded_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create table if not exists public.product_questions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.seller_products(id) on delete cascade,
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  question text not null check (char_length(btrim(question)) between 3 and 2000),
  answer text,
  answered_by uuid references public.user_profiles(user_id) on delete set null,
  answered_at timestamptz,
  status text not null default 'open' check (status in ('open', 'answered', 'hidden')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'answered' and answer is not null and answered_at is not null)
    or status <> 'answered'
  )
);

create index if not exists product_reviews_product_created_idx
  on public.product_reviews (product_id, created_at desc);
create index if not exists product_reviews_user_id_idx
  on public.product_reviews (user_id);
create index if not exists product_questions_product_created_idx
  on public.product_questions (product_id, created_at desc);
create index if not exists product_questions_user_id_idx
  on public.product_questions (user_id);
create index if not exists product_questions_answered_by_idx
  on public.product_questions (answered_by)
  where answered_by is not null;

alter table public.product_reviews enable row level security;
alter table public.product_questions enable row level security;

revoke all on public.product_reviews, public.product_questions from anon, authenticated;
grant select on public.product_reviews, public.product_questions to anon, authenticated;

drop policy if exists product_reviews_public_read on public.product_reviews;
create policy product_reviews_public_read
on public.product_reviews
for select
to anon, authenticated
using (
  status = 'published'
  and exists (
    select 1
    from public.seller_products as product
    where product.id = product_id
      and product.status = 'published'
  )
);

drop policy if exists product_questions_public_read on public.product_questions;
create policy product_questions_public_read
on public.product_questions
for select
to anon, authenticated
using (
  status = 'answered'
  and exists (
    select 1
    from public.seller_products as product
    where product.id = product_id
      and product.status = 'published'
  )
);

with target_product as (
  select id, seller_id
  from public.seller_products
  where slug = 'pack-transicoes-e-efeitos'
    and is_demo = true
  limit 1
), reviewers as (
  select user_id, full_name,
         row_number() over (order by full_name) as position
  from public.user_profiles
  where is_demo = true
    and role::text = 'student'
), review_seed(position, rating, comment, seller_response) as (
  values
    (1, 5, 'Os arquivos vieram organizados e encaixaram bem em vídeos verticais.', 'Obrigado pelo retorno. A organização foi pensada para acelerar a edição.'),
    (2, 5, 'A variedade de transições resolveu várias partes do meu lançamento.', null),
    (3, 4, 'Material prático, leve e fácil de adaptar no meu fluxo de trabalho.', null)
)
insert into public.product_reviews (
  product_id, user_id, rating, comment, status,
  seller_response, responded_at, is_demo, created_at, updated_at
)
select
  target_product.id,
  reviewers.user_id,
  review_seed.rating,
  review_seed.comment,
  'published',
  review_seed.seller_response,
  case when review_seed.seller_response is not null then now() - interval '2 days' else null end,
  true,
  now() - (review_seed.position || ' days')::interval,
  now() - interval '1 day'
from target_product
join reviewers on reviewers.position between 1 and 3
join review_seed on review_seed.position = reviewers.position
on conflict (product_id, user_id) do update
set rating = excluded.rating,
    comment = excluded.comment,
    status = excluded.status,
    seller_response = excluded.seller_response,
    responded_at = excluded.responded_at,
    is_demo = true,
    updated_at = excluded.updated_at;

with target_product as (
  select id, seller_id
  from public.seller_products
  where slug = 'pack-transicoes-e-efeitos'
    and is_demo = true
  limit 1
), questioners as (
  select user_id,
         row_number() over (order by full_name desc) as position
  from public.user_profiles
  where is_demo = true
    and role::text = 'student'
), question_seed(position, question, answer) as (
  values
    (1, 'Os arquivos funcionam em qualquer editor de vídeo?', 'Sim. O pacote inclui arquivos exportados em formatos comuns e uma pasta com orientações de uso.'),
    (2, 'Posso utilizar as transições em trabalhos comerciais para clientes?', 'Sim. A licença padrão permite o uso nos seus próprios projetos e em trabalhos entregues a clientes.')
)
insert into public.product_questions (
  product_id, user_id, question, answer, answered_by,
  answered_at, status, is_demo, created_at, updated_at
)
select
  target_product.id,
  questioners.user_id,
  question_seed.question,
  question_seed.answer,
  target_product.seller_id,
  now() - interval '1 day',
  'answered',
  true,
  now() - (question_seed.position + 3 || ' days')::interval,
  now() - interval '1 day'
from target_product
join questioners on questioners.position between 1 and 2
join question_seed on question_seed.position = questioners.position
where not exists (
  select 1
  from public.product_questions as existing
  where existing.product_id = target_product.id
    and existing.user_id = questioners.user_id
    and existing.question = question_seed.question
);
