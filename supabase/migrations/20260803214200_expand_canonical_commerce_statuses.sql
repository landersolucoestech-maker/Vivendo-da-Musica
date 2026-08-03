begin;

alter table public.commerce_orders drop constraint if exists commerce_orders_status_check;
alter table public.commerce_orders add constraint commerce_orders_status_check
check (status in ('pending','processing','paid','partially_refunded','refunded','chargeback','canceled','failed'));

alter table public.payment_attempts drop constraint if exists payment_attempts_status_check;
alter table public.payment_attempts add constraint payment_attempts_status_check
check (status in ('created','pending','authorized','paid','failed','canceled','expired'));

alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check
check (status in ('pending','authorized','paid','partially_refunded','refunded','chargeback','failed','canceled'));

alter table public.commerce_entitlements drop constraint if exists commerce_entitlements_status_check;
alter table public.commerce_entitlements add constraint commerce_entitlements_status_check
check (status in ('active','expired','revoked','refunded'));

alter table public.revenue_splits drop constraint if exists revenue_splits_status_check;
alter table public.revenue_splits add constraint revenue_splits_status_check
check (status in ('pending','reserved','available','paid','reversed'));

commit;
