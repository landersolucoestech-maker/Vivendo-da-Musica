alter policy beat_orders_owner_read on public.beat_order_items using ((producer_id = (select auth.uid())) or (buyer_id = (select auth.uid())) or is_platform_staff());
alter policy digital_product_orders_owner_read on public.digital_product_order_items using ((buyer_id = (select auth.uid())) or (seller_id = (select auth.uid())) or is_platform_staff());

drop policy if exists beat_order_items_buyer_read on public.beat_order_items;
drop policy if exists digital_product_order_items_buyer_read on public.digital_product_order_items;

alter policy demo_beat_order_items_read on public.beat_order_items using ((exists (select 1 from public.beat_orders o where o.id = beat_order_items.order_id and o.is_demo)) or producer_id = '22222222-2222-4222-8222-222222222222'::uuid or buyer_id = '11111111-1111-4111-8111-111111111111'::uuid);
drop policy if exists beat_orders_demo_read on public.beat_order_items;
alter policy demo_digital_product_order_items_read on public.digital_product_order_items using ((exists (select 1 from public.digital_product_orders o where o.id = digital_product_order_items.order_id and o.is_demo)) or seller_id = '22222222-2222-4222-8222-222222222222'::uuid or buyer_id = '11111111-1111-4111-8111-111111111111'::uuid);
drop policy if exists digital_product_orders_demo_read on public.digital_product_order_items;

-- The split policies may already exist when the repository rebuild includes the
-- restored development-domain migrations. Remove only the exact targets that
-- this consolidation recreates; permissions are recreated immediately below.
do $migration$
declare
  policy_target record;
begin
  for policy_target in
    select *
    from (values
      ('affiliate_commissions','affiliate_commissions_staff_insert'),
      ('affiliate_commissions','affiliate_commissions_staff_update'),
      ('affiliate_commissions','affiliate_commissions_staff_delete'),
      ('affiliate_conversions','affiliate_conversions_staff_insert'),
      ('affiliate_conversions','affiliate_conversions_staff_update'),
      ('affiliate_conversions','affiliate_conversions_staff_delete'),
      ('affiliate_links','affiliate_links_owner_insert'),
      ('affiliate_links','affiliate_links_owner_update'),
      ('affiliate_links','affiliate_links_owner_delete'),
      ('affiliate_marketing_materials','affiliate_materials_staff_insert'),
      ('affiliate_marketing_materials','affiliate_materials_staff_update'),
      ('affiliate_marketing_materials','affiliate_materials_staff_delete'),
      ('affiliate_profiles','affiliate_profiles_staff_insert'),
      ('affiliate_profiles','affiliate_profiles_staff_update'),
      ('affiliate_profiles','affiliate_profiles_staff_delete'),
      ('beats','beats_demo_insert'),
      ('beats','beats_demo_update'),
      ('beats','beats_demo_delete'),
      ('beats','beats_owner_insert'),
      ('beats','beats_owner_update'),
      ('beats','beats_owner_delete'),
      ('beat_licenses','beat_licenses_demo_insert'),
      ('beat_licenses','beat_licenses_demo_update'),
      ('beat_licenses','beat_licenses_demo_delete'),
      ('beat_licenses','beat_licenses_owner_insert'),
      ('beat_licenses','beat_licenses_owner_update'),
      ('beat_licenses','beat_licenses_owner_delete'),
      ('seller_products','seller_products_demo_insert'),
      ('seller_products','seller_products_demo_update'),
      ('seller_products','seller_products_demo_delete'),
      ('seller_products','seller_products_owner_insert'),
      ('seller_products','seller_products_owner_update'),
      ('seller_products','seller_products_owner_delete'),
      ('seller_product_files','seller_product_files_demo_insert'),
      ('seller_product_files','seller_product_files_demo_update'),
      ('seller_product_files','seller_product_files_demo_delete'),
      ('seller_product_files','seller_product_files_owner_insert'),
      ('seller_product_files','seller_product_files_owner_update'),
      ('seller_product_files','seller_product_files_owner_delete')
    ) as targets(table_name, policy_name)
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      policy_target.policy_name,
      policy_target.table_name
    );
  end loop;
end
$migration$;

drop policy if exists affiliate_commissions_staff_write on public.affiliate_commissions;
create policy affiliate_commissions_staff_insert on public.affiliate_commissions for insert to authenticated with check (is_platform_staff());
create policy affiliate_commissions_staff_update on public.affiliate_commissions for update to authenticated using (is_platform_staff()) with check (is_platform_staff());
create policy affiliate_commissions_staff_delete on public.affiliate_commissions for delete to authenticated using (is_platform_staff());

drop policy if exists affiliate_conversions_staff_write on public.affiliate_conversions;
create policy affiliate_conversions_staff_insert on public.affiliate_conversions for insert to authenticated with check (is_platform_staff());
create policy affiliate_conversions_staff_update on public.affiliate_conversions for update to authenticated using (is_platform_staff()) with check (is_platform_staff());
create policy affiliate_conversions_staff_delete on public.affiliate_conversions for delete to authenticated using (is_platform_staff());

drop policy if exists affiliate_links_owner_write on public.affiliate_links;
create policy affiliate_links_owner_insert on public.affiliate_links for insert to authenticated with check (exists (select 1 from public.affiliate_profiles p where p.id = affiliate_links.affiliate_id and (p.user_id = (select auth.uid()) or is_platform_staff())));
create policy affiliate_links_owner_update on public.affiliate_links for update to authenticated using (exists (select 1 from public.affiliate_profiles p where p.id = affiliate_links.affiliate_id and (p.user_id = (select auth.uid()) or is_platform_staff()))) with check (exists (select 1 from public.affiliate_profiles p where p.id = affiliate_links.affiliate_id and (p.user_id = (select auth.uid()) or is_platform_staff())));
create policy affiliate_links_owner_delete on public.affiliate_links for delete to authenticated using (exists (select 1 from public.affiliate_profiles p where p.id = affiliate_links.affiliate_id and (p.user_id = (select auth.uid()) or is_platform_staff())));

drop policy if exists affiliate_materials_staff_write on public.affiliate_marketing_materials;
create policy affiliate_materials_staff_insert on public.affiliate_marketing_materials for insert to authenticated with check (is_platform_staff());
create policy affiliate_materials_staff_update on public.affiliate_marketing_materials for update to authenticated using (is_platform_staff()) with check (is_platform_staff());
create policy affiliate_materials_staff_delete on public.affiliate_marketing_materials for delete to authenticated using (is_platform_staff());

drop policy if exists affiliate_profiles_staff_write on public.affiliate_profiles;
create policy affiliate_profiles_staff_insert on public.affiliate_profiles for insert to authenticated with check (is_platform_staff());
create policy affiliate_profiles_staff_update on public.affiliate_profiles for update to authenticated using (is_platform_staff()) with check (is_platform_staff());
create policy affiliate_profiles_staff_delete on public.affiliate_profiles for delete to authenticated using (is_platform_staff());

drop policy if exists beats_demo_write on public.beats;
create policy beats_demo_insert on public.beats for insert to anon with check (is_demo and producer_id = '22222222-2222-4222-8222-222222222222'::uuid);
create policy beats_demo_update on public.beats for update to anon using (is_demo and producer_id = '22222222-2222-4222-8222-222222222222'::uuid) with check (is_demo and producer_id = '22222222-2222-4222-8222-222222222222'::uuid);
create policy beats_demo_delete on public.beats for delete to anon using (is_demo and producer_id = '22222222-2222-4222-8222-222222222222'::uuid);

drop policy if exists beats_owner_write on public.beats;
create policy beats_owner_insert on public.beats for insert to authenticated with check (producer_id = (select auth.uid()) or is_platform_staff());
create policy beats_owner_update on public.beats for update to authenticated using (producer_id = (select auth.uid()) or is_platform_staff()) with check (producer_id = (select auth.uid()) or is_platform_staff());
create policy beats_owner_delete on public.beats for delete to authenticated using (producer_id = (select auth.uid()) or is_platform_staff());

drop policy if exists beat_licenses_demo_write on public.beat_licenses;
create policy beat_licenses_demo_insert on public.beat_licenses for insert to anon with check (exists (select 1 from public.beats b where b.id = beat_licenses.beat_id and b.is_demo));
create policy beat_licenses_demo_update on public.beat_licenses for update to anon using (exists (select 1 from public.beats b where b.id = beat_licenses.beat_id and b.is_demo)) with check (exists (select 1 from public.beats b where b.id = beat_licenses.beat_id and b.is_demo));
create policy beat_licenses_demo_delete on public.beat_licenses for delete to anon using (exists (select 1 from public.beats b where b.id = beat_licenses.beat_id and b.is_demo));

drop policy if exists beat_licenses_owner_write on public.beat_licenses;
create policy beat_licenses_owner_insert on public.beat_licenses for insert to authenticated with check (exists (select 1 from public.beats b where b.id = beat_licenses.beat_id and (b.producer_id = (select auth.uid()) or is_platform_staff())));
create policy beat_licenses_owner_update on public.beat_licenses for update to authenticated using (exists (select 1 from public.beats b where b.id = beat_licenses.beat_id and (b.producer_id = (select auth.uid()) or is_platform_staff()))) with check (exists (select 1 from public.beats b where b.id = beat_licenses.beat_id and (b.producer_id = (select auth.uid()) or is_platform_staff())));
create policy beat_licenses_owner_delete on public.beat_licenses for delete to authenticated using (exists (select 1 from public.beats b where b.id = beat_licenses.beat_id and (b.producer_id = (select auth.uid()) or is_platform_staff())));

drop policy if exists seller_products_demo_write on public.seller_products;
create policy seller_products_demo_insert on public.seller_products for insert to anon with check (is_demo and seller_id = '22222222-2222-4222-8222-222222222222'::uuid);
create policy seller_products_demo_update on public.seller_products for update to anon using (is_demo and seller_id = '22222222-2222-4222-8222-222222222222'::uuid) with check (is_demo and seller_id = '22222222-2222-4222-8222-222222222222'::uuid);
create policy seller_products_demo_delete on public.seller_products for delete to anon using (is_demo and seller_id = '22222222-2222-4222-8222-222222222222'::uuid);

drop policy if exists seller_products_owner_write on public.seller_products;
create policy seller_products_owner_insert on public.seller_products for insert to authenticated with check (seller_id = (select auth.uid()) or is_platform_staff());
create policy seller_products_owner_update on public.seller_products for update to authenticated using (seller_id = (select auth.uid()) or is_platform_staff()) with check (seller_id = (select auth.uid()) or is_platform_staff());
create policy seller_products_owner_delete on public.seller_products for delete to authenticated using (seller_id = (select auth.uid()) or is_platform_staff());

drop policy if exists seller_product_files_demo_write on public.seller_product_files;
create policy seller_product_files_demo_insert on public.seller_product_files for insert to anon with check (exists (select 1 from public.seller_products p where p.id = seller_product_files.product_id and p.is_demo));
create policy seller_product_files_demo_update on public.seller_product_files for update to anon using (exists (select 1 from public.seller_products p where p.id = seller_product_files.product_id and p.is_demo)) with check (exists (select 1 from public.seller_products p where p.id = seller_product_files.product_id and p.is_demo));
create policy seller_product_files_demo_delete on public.seller_product_files for delete to anon using (exists (select 1 from public.seller_products p where p.id = seller_product_files.product_id and p.is_demo));

drop policy if exists seller_product_files_owner_write on public.seller_product_files;
create policy seller_product_files_owner_insert on public.seller_product_files for insert to authenticated with check (exists (select 1 from public.seller_products p where p.id = seller_product_files.product_id and (p.seller_id = (select auth.uid()) or is_platform_staff())));
create policy seller_product_files_owner_update on public.seller_product_files for update to authenticated using (exists (select 1 from public.seller_products p where p.id = seller_product_files.product_id and (p.seller_id = (select auth.uid()) or is_platform_staff()))) with check (exists (select 1 from public.seller_products p where p.id = seller_product_files.product_id and (p.seller_id = (select auth.uid()) or is_platform_staff())));
create policy seller_product_files_owner_delete on public.seller_product_files for delete to authenticated using (exists (select 1 from public.seller_products p where p.id = seller_product_files.product_id and (p.seller_id = (select auth.uid()) or is_platform_staff())));
