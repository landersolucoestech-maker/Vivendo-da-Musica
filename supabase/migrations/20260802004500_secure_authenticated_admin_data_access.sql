create policy admin_audit_logs_staff_select on public.admin_audit_logs
for select to authenticated
using (public.is_platform_staff());

create policy platform_integrations_staff_select on public.platform_integrations
for select to authenticated
using (public.is_platform_staff());

create policy platform_integrations_staff_update on public.platform_integrations
for update to authenticated
using (public.is_platform_staff())
with check (public.is_platform_staff());

create policy marketing_campaigns_staff_select on public.marketing_campaigns
for select to authenticated
using (public.is_platform_staff());

create policy marketing_campaigns_staff_insert on public.marketing_campaigns
for insert to authenticated
with check (public.is_platform_staff());

create policy marketing_campaigns_staff_update on public.marketing_campaigns
for update to authenticated
using (public.is_platform_staff())
with check (public.is_platform_staff());

create policy marketing_campaigns_staff_delete on public.marketing_campaigns
for delete to authenticated
using (public.is_platform_staff());

create policy marketing_leads_staff_select on public.marketing_leads
for select to authenticated
using (public.is_platform_staff());

create policy marketing_leads_staff_update on public.marketing_leads
for update to authenticated
using (public.is_platform_staff())
with check (public.is_platform_staff());

create policy marketing_leads_staff_delete on public.marketing_leads
for delete to authenticated
using (public.is_platform_staff());

create policy discount_coupons_staff_select on public.discount_coupons
for select to authenticated
using (public.is_platform_staff());

create policy discount_coupons_staff_insert on public.discount_coupons
for insert to authenticated
with check (public.is_platform_staff());

create policy discount_coupons_staff_update on public.discount_coupons
for update to authenticated
using (public.is_platform_staff())
with check (public.is_platform_staff());

create policy discount_coupons_staff_delete on public.discount_coupons
for delete to authenticated
using (public.is_platform_staff());

create policy coupon_redemptions_staff_select on public.coupon_redemptions
for select to authenticated
using (public.is_platform_staff());

create policy platform_financial_settings_staff_update on public.platform_financial_settings
for update to authenticated
using (public.is_platform_staff())
with check (public.is_platform_staff());
