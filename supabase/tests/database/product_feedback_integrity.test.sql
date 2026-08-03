begin;

select plan(7);

select is(
  (
    select count(*)
    from public.product_reviews as review
    join public.seller_products as product on product.id = review.product_id
    where review.status::text = 'published'
      and product.status::text <> 'published'
  ),
  0::bigint,
  'published product reviews belong to published products'
);

select is(
  (
    select count(*)
    from public.product_questions as question
    join public.seller_products as product on product.id = question.product_id
    where question.status::text = 'answered'
      and product.status::text <> 'published'
  ),
  0::bigint,
  'answered product questions belong to published products'
);

select is(
  (
    select count(*)
    from public.product_questions
    where status::text = 'answered'
      and (answer is null or answered_at is null or answered_by is null)
  ),
  0::bigint,
  'answered product questions include answer metadata'
);

select is(
  (
    select count(*)
    from public.product_reviews as review
    join public.seller_products as product on product.id = review.product_id
    join public.user_profiles as profile on profile.user_id = review.user_id
    where review.is_demo = true
      and (product.is_demo = false or profile.is_demo = false)
  ),
  0::bigint,
  'demo product reviews reference demo products and profiles'
);

select is(
  (
    select count(*)
    from public.product_questions as question
    join public.seller_products as product on product.id = question.product_id
    join public.user_profiles as profile on profile.user_id = question.user_id
    where question.is_demo = true
      and (product.is_demo = false or profile.is_demo = false)
  ),
  0::bigint,
  'demo product questions reference demo products and profiles'
);

select ok(
  (
    select count(*) >= 3
    from public.product_reviews as review
    join public.seller_products as product on product.id = review.product_id
    where product.slug = 'pack-transicoes-e-efeitos'
      and review.status::text = 'published'
  ),
  'the featured demo product contains representative published reviews'
);

select ok(
  (
    select count(*) >= 2
    from public.product_questions as question
    join public.seller_products as product on product.id = question.product_id
    where product.slug = 'pack-transicoes-e-efeitos'
      and question.status::text = 'answered'
  ),
  'the featured demo product contains representative answered questions'
);

select * from finish();
rollback;
