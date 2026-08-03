begin;

alter table public.service_categories enable row level security;
alter table public.service_listings enable row level security;
alter table public.service_packages enable row level security;
alter table public.service_requests enable row level security;
alter table public.service_proposals enable row level security;
alter table public.service_contracts enable row level security;
alter table public.service_milestones enable row level security;
alter table public.service_deliveries enable row level security;
alter table public.service_disputes enable row level security;
alter table public.service_reviews enable row level security;
alter table public.service_messages enable row level security;

create policy service_categories_public_read on public.service_categories
for select to anon, authenticated using (active or public.is_platform_staff());
create policy service_categories_staff_manage on public.service_categories
for all to authenticated using (public.is_platform_staff()) with check (public.is_platform_staff());

create policy service_listings_public_read on public.service_listings
for select to anon using (status = 'published' and moderation_status = 'approved');
create policy service_listings_authenticated_read on public.service_listings
for select to authenticated using (
  (status = 'published' and moderation_status = 'approved')
  or provider_id = (select auth.uid())
  or public.is_platform_staff()
);
create policy service_listings_provider_manage on public.service_listings
for all to authenticated
using (provider_id = (select auth.uid()) or public.is_platform_staff())
with check (provider_id = (select auth.uid()) or public.is_platform_staff());

create policy service_packages_public_read on public.service_packages
for select to anon using (
  active
  and exists (
    select 1 from public.service_listings listing
    where listing.id = listing_id
      and listing.status = 'published'
      and listing.moderation_status = 'approved'
  )
);
create policy service_packages_authenticated_read on public.service_packages
for select to authenticated using (
  active
  or exists (
    select 1 from public.service_listings listing
    where listing.id = listing_id
      and (listing.provider_id = (select auth.uid()) or public.is_platform_staff())
  )
);
create policy service_packages_provider_manage on public.service_packages
for all to authenticated
using (
  exists (
    select 1 from public.service_listings listing
    where listing.id = listing_id
      and (listing.provider_id = (select auth.uid()) or public.is_platform_staff())
  )
)
with check (
  exists (
    select 1 from public.service_listings listing
    where listing.id = listing_id
      and (listing.provider_id = (select auth.uid()) or public.is_platform_staff())
  )
);

create policy service_requests_participant_read on public.service_requests
for select to authenticated using (
  client_id = (select auth.uid())
  or public.is_platform_staff()
  or status = 'open'
);
create policy service_requests_client_manage on public.service_requests
for all to authenticated
using (client_id = (select auth.uid()) or public.is_platform_staff())
with check (client_id = (select auth.uid()) or public.is_platform_staff());

create policy service_proposals_participant_read on public.service_proposals
for select to authenticated using (
  provider_id = (select auth.uid())
  or public.is_platform_staff()
  or exists (
    select 1 from public.service_requests request
    where request.id = request_id
      and request.client_id = (select auth.uid())
  )
);
create policy service_proposals_provider_manage on public.service_proposals
for all to authenticated
using (provider_id = (select auth.uid()) or public.is_platform_staff())
with check (provider_id = (select auth.uid()) or public.is_platform_staff());

create policy service_contracts_participant_read on public.service_contracts
for select to authenticated using (
  buyer_id = (select auth.uid())
  or provider_id = (select auth.uid())
  or public.is_platform_staff()
);
create policy service_contracts_staff_manage on public.service_contracts
for all to authenticated using (public.is_platform_staff()) with check (public.is_platform_staff());

create policy service_milestones_participant_read on public.service_milestones
for select to authenticated using (
  exists (
    select 1 from public.service_contracts contract
    where contract.id = contract_id
      and (
        contract.buyer_id = (select auth.uid())
        or contract.provider_id = (select auth.uid())
        or public.is_platform_staff()
      )
  )
);
create policy service_milestones_staff_manage on public.service_milestones
for all to authenticated using (public.is_platform_staff()) with check (public.is_platform_staff());

create policy service_deliveries_participant_read on public.service_deliveries
for select to authenticated using (
  exists (
    select 1
    from public.service_milestones milestone
    join public.service_contracts contract on contract.id = milestone.contract_id
    where milestone.id = milestone_id
      and (
        contract.buyer_id = (select auth.uid())
        or contract.provider_id = (select auth.uid())
        or public.is_platform_staff()
      )
  )
);
create policy service_deliveries_provider_insert on public.service_deliveries
for insert to authenticated with check (
  submitted_by = (select auth.uid())
  and exists (
    select 1
    from public.service_milestones milestone
    join public.service_contracts contract on contract.id = milestone.contract_id
    where milestone.id = milestone_id
      and contract.provider_id = (select auth.uid())
  )
);
create policy service_deliveries_staff_manage on public.service_deliveries
for all to authenticated using (public.is_platform_staff()) with check (public.is_platform_staff());

create policy service_disputes_participant_read on public.service_disputes
for select to authenticated using (
  exists (
    select 1 from public.service_contracts contract
    where contract.id = contract_id
      and (
        contract.buyer_id = (select auth.uid())
        or contract.provider_id = (select auth.uid())
        or public.is_platform_staff()
      )
  )
);
create policy service_disputes_participant_insert on public.service_disputes
for insert to authenticated with check (
  opened_by = (select auth.uid())
  and exists (
    select 1 from public.service_contracts contract
    where contract.id = contract_id
      and (
        contract.buyer_id = (select auth.uid())
        or contract.provider_id = (select auth.uid())
      )
  )
);
create policy service_disputes_staff_manage on public.service_disputes
for all to authenticated using (public.is_platform_staff()) with check (public.is_platform_staff());

create policy service_reviews_public_read on public.service_reviews
for select to anon, authenticated using (true);
create policy service_reviews_participant_insert on public.service_reviews
for insert to authenticated with check (
  reviewer_id = (select auth.uid())
  and exists (
    select 1 from public.service_contracts contract
    where contract.id = contract_id
      and contract.status = 'completed'
      and (
        contract.buyer_id = (select auth.uid())
        or contract.provider_id = (select auth.uid())
      )
  )
);
create policy service_reviews_owner_update on public.service_reviews
for update to authenticated
using (reviewer_id = (select auth.uid()) or public.is_platform_staff())
with check (reviewer_id = (select auth.uid()) or public.is_platform_staff());

create policy service_messages_participant_read on public.service_messages
for select to authenticated using (
  exists (
    select 1 from public.service_contracts contract
    where contract.id = contract_id
      and (
        contract.buyer_id = (select auth.uid())
        or contract.provider_id = (select auth.uid())
        or public.is_platform_staff()
      )
  )
);
create policy service_messages_participant_insert on public.service_messages
for insert to authenticated with check (
  sender_id = (select auth.uid())
  and exists (
    select 1 from public.service_contracts contract
    where contract.id = contract_id
      and (
        contract.buyer_id = (select auth.uid())
        or contract.provider_id = (select auth.uid())
      )
  )
);

grant select on public.service_categories, public.service_listings, public.service_packages, public.service_reviews to anon, authenticated;
grant select, insert, update, delete on public.service_categories, public.service_listings, public.service_packages, public.service_requests, public.service_proposals, public.service_contracts, public.service_milestones, public.service_deliveries, public.service_disputes, public.service_reviews, public.service_messages to authenticated;
grant all on public.service_categories, public.service_listings, public.service_packages, public.service_requests, public.service_proposals, public.service_contracts, public.service_milestones, public.service_deliveries, public.service_disputes, public.service_reviews, public.service_messages to service_role;

commit;
