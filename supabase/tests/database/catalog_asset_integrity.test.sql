begin;

select plan(5);

select is(
  (
    select count(*)
    from public.beats
    where is_demo = true
      and status::text = 'published'
      and (cover_url is null or btrim(cover_url) = '')
  ),
  0::bigint,
  'published demo beats include cover images'
);

select is(
  (
    select count(*)
    from public.beats
    where is_demo = true
      and status::text = 'published'
      and (preview_file_path is null or btrim(preview_file_path) = '')
  ),
  0::bigint,
  'published demo beats include audio previews'
);

select is(
  (
    select count(*)
    from public.seller_products
    where is_demo = true
      and status::text = 'published'
      and (cover_url is null or btrim(cover_url) = '')
  ),
  0::bigint,
  'published demo products include cover images'
);

select is(
  (
    select count(*)
    from public.courses
    where is_demo = true
      and status::text = 'published'
      and (thumbnail_url is null or btrim(thumbnail_url) = '')
  ),
  0::bigint,
  'published demo courses include thumbnails'
);

select is(
  (
    select count(*)
    from public.academy_contents
    where is_demo = true
      and status::text = 'published'
      and (thumbnail_url is null or btrim(thumbnail_url) = '')
  ),
  0::bigint,
  'published demo academy contents include thumbnails'
);

select * from finish();
rollback;
