-- Public lesson asset buckets serve known object URLs directly. Reconcile the
-- bucket metadata in clean replays and remove every historical anonymous
-- storage.objects listing policy regardless of its original name.

update storage.buckets
set public = true
where id in ('lesson-projects', 'lesson-samples');

do $$
declare
  listing_policy record;
begin
  for listing_policy in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and cmd = 'SELECT'
      and ('public' = any(roles) or 'anon' = any(roles))
      and (
        coalesce(qual, '') like '%lesson-projects%'
        or coalesce(qual, '') like '%lesson-samples%'
      )
  loop
    execute format(
      'drop policy if exists %I on storage.objects',
      listing_policy.policyname
    );
  end loop;
end;
$$;
