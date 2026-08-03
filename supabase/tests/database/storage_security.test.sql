begin;

select plan(5);

select is(
  (select public from storage.buckets where id = 'academy-videos'),
  false,
  'academy video delivery bucket is private'
);

select is(
  (select public from storage.buckets where id = 'academy-materials'),
  false,
  'academy material delivery bucket is private'
);

select is(
  (
    select count(*)
    from storage.buckets
    where id in ('lesson-materials', 'lesson-projects', 'lesson-samples')
      and public = true
  ),
  0::bigint,
  'lesson delivery buckets are private'
);

select is(
  (select public from storage.buckets where id = 'seller-product-files'),
  false,
  'digital product delivery bucket is private'
);

select is(
  (
    select count(*)
    from storage.buckets
    where id in ('beat-masters', 'beat-stems')
      and public = true
  ),
  0::bigint,
  'purchased beat delivery buckets are private'
);

select * from finish();
rollback;
