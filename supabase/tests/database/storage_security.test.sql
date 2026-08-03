begin;

select plan(13);

select is((select public from storage.buckets where id = 'academy-videos'), false, 'academy video delivery bucket is private');
select is((select public from storage.buckets where id = 'academy-materials'), false, 'academy material delivery bucket is private');

select is(
  (select count(*) from storage.buckets where id in ('lesson-materials', 'lesson-projects', 'lesson-samples') and public = true),
  0::bigint,
  'lesson delivery buckets are private'
);

select is((select public from storage.buckets where id = 'lesson-videos'), false, 'lesson video delivery bucket is private');

select is(
  (select file_size_limit from storage.buckets where id = 'lesson-videos'),
  524288000::bigint,
  'lesson video upload is limited to 500 MB'
);

select is(
  (select count(*) from public.lessons where video_url ~* '^(https?:)?//'),
  0::bigint,
  'lesson videos never store external provider URLs'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.lessons'::regclass
      and conname = 'lessons_video_url_private_path_check'
  ),
  'lesson video paths are protected by a database constraint'
);

select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and 'anon' = any(roles)
      and coalesce(qual, with_check, '') ilike '%lesson-videos%'
      and coalesce(qual, with_check, '') not ilike '%is_demo%'
  ),
  0::bigint,
  'anonymous lesson video policies are restricted to synthetic dev courses'
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
