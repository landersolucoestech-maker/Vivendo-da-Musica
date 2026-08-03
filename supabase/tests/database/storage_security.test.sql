begin;

select plan(8);

select is((select public from storage.buckets where id = 'academy-videos'), false, 'academy video delivery bucket is private');
select is((select public from storage.buckets where id = 'academy-materials'), false, 'academy material delivery bucket is private');

select is(
  (select count(*) from storage.buckets where id in ('lesson-materials', 'lesson-projects', 'lesson-samples') and public = true),
  0::bigint,
  'lesson delivery buckets are private'
);

select is((select public from storage.buckets where id = 'seller-product-files'), false, 'digital product delivery bucket is private');

select is(
  (select count(*) from storage.buckets where id in ('beat-masters', 'beat-stems') and public = true),
  0::bigint,
  'purchased beat delivery buckets are private'
);

select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and cmd = 'SELECT'
      and 'anon' = any(roles)
      and (qual ilike '%academy-videos%' or qual ilike '%academy-materials%')
  ),
  0::bigint,
  'anonymous users cannot read academy delivery objects'
);

select is((select public from storage.buckets where id = 'academy-images'), true, 'academy image bucket stays public');

select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and cmd = 'SELECT'
      and 'anon' = any(roles)
      and qual ilike '%academy-images%'
  ),
  0::bigint,
  'academy image rows are not broadly listable'
);

select * from finish();
rollback;
