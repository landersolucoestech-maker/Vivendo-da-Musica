-- Consolidate coupon, seller-product and service-catalog policies. Preserve
-- staff exceptions explicitly and remove ALL-policy read overlap.

-- Coupon redemptions.
drop policy if exists "Users view own coupon redemptions" on public.coupon_redemptions;
drop policy if exists coupon_redemptions_staff_select on public.coupon_redemptions;
create policy coupon_redemptions_authenticated_read
on public.coupon_redemptions
for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.is_platform_staff()
);

-- Seller products.
create or replace function app_private.protect_seller_product_client_update()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if new.id is distinct from old.id
      or new.seller_id is distinct from old.seller_id
      or new.is_demo is distinct from old.is_demo
      or new.created_at is distinct from old.created_at then
      raise exception 'Identidade do produto não pode ser alterada.';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function app_private.protect_seller_product_client_update() from public, anon, authenticated;

drop trigger if exists protect_seller_product_client_update on public.seller_products;
create trigger protect_seller_product_client_update
before update on public.seller_products
for each row execute function app_private.protect_seller_product_client_update();

drop policy if exists "Sellers create own products" on public.seller_products;
drop policy if exists seller_products_owner_insert on public.seller_products;
create policy seller_products_owner_insert
on public.seller_products
for insert
to authenticated
with check (
  seller_id = (select auth.uid())
  or public.is_platform_staff()
);

drop policy if exists "Sellers update own products" on public.seller_products;
drop policy if exists seller_products_owner_update on public.seller_products;
create policy seller_products_owner_update
on public.seller_products
for update
to authenticated
using (
  seller_id = (select auth.uid())
  or public.is_platform_staff()
)
with check (
  seller_id = (select auth.uid())
  or public.is_platform_staff()
);

drop policy if exists "Sellers delete own draft products" on public.seller_products;
drop policy if exists seller_products_owner_delete on public.seller_products;
create policy seller_products_owner_delete
on public.seller_products
for delete
to authenticated
using (
  (seller_id = (select auth.uid()) and status = 'draft')
  or public.is_platform_staff()
);

-- Service listings.
drop policy if exists service_listings_provider_manage on public.service_listings;

create policy service_listings_provider_insert
on public.service_listings
for insert
to authenticated
with check (
  provider_id = (select auth.uid())
  or public.is_platform_staff()
);

create policy service_listings_provider_update
on public.service_listings
for update
to authenticated
using (
  provider_id = (select auth.uid())
  or public.is_platform_staff()
)
with check (
  provider_id = (select auth.uid())
  or public.is_platform_staff()
);

create policy service_listings_provider_delete
on public.service_listings
for delete
to authenticated
using (
  provider_id = (select auth.uid())
  or public.is_platform_staff()
);

drop policy if exists service_listings_demo_management_read on public.service_listings;
drop policy if exists service_listings_public_read on public.service_listings;
create policy service_listings_anon_read
on public.service_listings
for select
to anon
using (
  is_demo = true
  or (status = 'published' and moderation_status = 'approved')
);

-- Service packages.
drop policy if exists service_packages_provider_manage on public.service_packages;

create policy service_packages_provider_insert
on public.service_packages
for insert
to authenticated
with check (
  exists (
    select 1
    from public.service_listings as listing
    where listing.id = service_packages.listing_id
      and (
        listing.provider_id = (select auth.uid())
        or public.is_platform_staff()
      )
  )
);

create policy service_packages_provider_update
on public.service_packages
for update
to authenticated
using (
  exists (
    select 1
    from public.service_listings as listing
    where listing.id = service_packages.listing_id
      and (
        listing.provider_id = (select auth.uid())
        or public.is_platform_staff()
      )
  )
)
with check (
  exists (
    select 1
    from public.service_listings as listing
    where listing.id = service_packages.listing_id
      and (
        listing.provider_id = (select auth.uid())
        or public.is_platform_staff()
      )
  )
);

create policy service_packages_provider_delete
on public.service_packages
for delete
to authenticated
using (
  exists (
    select 1
    from public.service_listings as listing
    where listing.id = service_packages.listing_id
      and (
        listing.provider_id = (select auth.uid())
        or public.is_platform_staff()
      )
  )
);

drop policy if exists service_packages_demo_management_read on public.service_packages;
drop policy if exists service_packages_public_read on public.service_packages;
create policy service_packages_anon_read
on public.service_packages
for select
to anon
using (
  exists (
    select 1
    from public.service_listings as listing
    where listing.id = service_packages.listing_id
      and (
        listing.is_demo = true
        or (
          service_packages.active = true
          and listing.status = 'published'
          and listing.moderation_status = 'approved'
        )
      )
  )
);
