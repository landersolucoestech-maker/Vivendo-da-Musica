drop policy if exists beats_public_read on public.beats;
create policy beats_anon_read
on public.beats
for select
to anon
using (status = 'published' or is_demo = true);
create policy beats_authenticated_read
on public.beats
for select
to authenticated
using (
  status = 'published'
  or is_demo = true
  or producer_id = (select auth.uid())
  or public.is_platform_staff()
);

drop policy if exists beat_licenses_public_read on public.beat_licenses;
create policy beat_licenses_anon_read
on public.beat_licenses
for select
to anon
using (
  exists (
    select 1
    from public.beats beat
    where beat.id = beat_licenses.beat_id
      and (beat.status = 'published' or beat.is_demo = true)
  )
);
create policy beat_licenses_authenticated_read
on public.beat_licenses
for select
to authenticated
using (
  exists (
    select 1
    from public.beats beat
    where beat.id = beat_licenses.beat_id
      and (
        beat.status = 'published'
        or beat.is_demo = true
        or beat.producer_id = (select auth.uid())
        or public.is_platform_staff()
      )
  )
);
