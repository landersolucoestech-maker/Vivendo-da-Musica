begin;

create policy service_listings_demo_management_read
on public.service_listings
for select to anon
using (is_demo);

create policy service_packages_demo_management_read
on public.service_packages
for select to anon
using (
  exists (
    select 1 from public.service_listings listing
    where listing.id = listing_id
      and listing.is_demo
  )
);

grant select on public.service_listings, public.service_packages to anon;

commit;
