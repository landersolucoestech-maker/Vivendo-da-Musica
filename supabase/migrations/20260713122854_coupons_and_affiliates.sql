create type public.discount_type as enum ('percent','fixed');
create type public.promotion_reservation_status as enum ('reserved','redeemed','released');
create type public.affiliate_status as enum ('pending','active','suspended');
create type public.affiliate_commission_status as enum ('pending','approved','reversed','paid');

create table public.discount_coupons (
 id uuid primary key default gen_random_uuid(), code text not null unique,
 discount_type public.discount_type not null, discount_value integer not null,
 minimum_amount_cents integer not null default 0, maximum_discount_cents integer,
 usage_limit integer, per_user_limit integer not null default 1,
 starts_at timestamptz not null default now(), ends_at timestamptz,
 active boolean not null default true, created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check (code=upper(code) and code ~ '^[A-Z0-9_-]{3,32}$'),
 check ((discount_type='percent' and discount_value between 1 and 10000) or (discount_type='fixed' and discount_value>0)),
 check (minimum_amount_cents>=0 and (maximum_discount_cents is null or maximum_discount_cents>0)
   and (usage_limit is null or usage_limit>0) and per_user_limit>0 and (ends_at is null or ends_at>starts_at))
);
create index discount_coupons_active_period_idx on public.discount_coupons(active,starts_at,ends_at);
create table public.affiliates (
 id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade,
 code text not null unique, status public.affiliate_status not null default 'pending',
 commission_bps integer not null default 500 check(commission_bps between 0 and 10000),
 created_at timestamptz not null default now(), approved_at timestamptz,
 check(code=upper(code) and code ~ '^[A-Z0-9_-]{3,32}$')
);
alter table public.beat_orders add column subtotal_cents integer not null default 0,
 add column discount_cents integer not null default 0,
 add column coupon_id uuid references public.discount_coupons(id) on delete set null,
 add column affiliate_id uuid references public.affiliates(id) on delete set null;
update public.beat_orders set subtotal_cents=amount_cents where subtotal_cents=0 and amount_cents>0;
alter table public.beat_orders add constraint beat_orders_discount_check
 check(subtotal_cents>=0 and discount_cents>=0 and amount_cents=subtotal_cents-discount_cents);
alter table public.beat_order_items add column list_price_cents integer;
update public.beat_order_items set list_price_cents=amount_cents where list_price_cents is null;
alter table public.beat_order_items alter column list_price_cents set not null;
alter table public.beat_order_items add constraint beat_order_items_price_check check(list_price_cents>=amount_cents and amount_cents>=0);

create table public.coupon_redemptions (
 id uuid primary key default gen_random_uuid(), coupon_id uuid not null references public.discount_coupons(id) on delete restrict,
 order_id uuid not null unique references public.beat_orders(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, discount_cents integer not null check(discount_cents>0),
 status public.promotion_reservation_status not null default 'reserved',
 created_at timestamptz not null default now(), redeemed_at timestamptz
);
create index coupon_redemptions_coupon_status_idx on public.coupon_redemptions(coupon_id,status);
create index coupon_redemptions_user_coupon_idx on public.coupon_redemptions(user_id,coupon_id,status);
create table public.affiliate_referrals (
 id uuid primary key default gen_random_uuid(), affiliate_id uuid not null references public.affiliates(id) on delete restrict,
 order_id uuid not null unique references public.beat_orders(id) on delete cascade,
 buyer_id uuid not null references auth.users(id) on delete cascade,
 commission_bps integer not null check(commission_bps between 0 and 10000),
 commission_cents integer not null check(commission_cents>=0),
 status public.affiliate_commission_status not null default 'pending',
 created_at timestamptz not null default now(), approved_at timestamptz
);
create index affiliate_referrals_affiliate_status_idx on public.affiliate_referrals(affiliate_id,status,created_at);

alter table public.discount_coupons enable row level security;
alter table public.affiliates enable row level security;
alter table public.coupon_redemptions enable row level security;
alter table public.affiliate_referrals enable row level security;
create policy "Admins manage coupons" on public.discount_coupons for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Affiliates view own profile" on public.affiliates for select to authenticated using(user_id=(select auth.uid()) or public.is_admin());
create policy "Admins manage affiliates" on public.affiliates for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Users view own coupon redemptions" on public.coupon_redemptions for select to authenticated using(user_id=(select auth.uid()) or public.is_admin());
create policy "Affiliates view own referrals" on public.affiliate_referrals for select to authenticated using(
 buyer_id=(select auth.uid()) or public.is_admin() or exists(select 1 from public.affiliates a where a.id=affiliate_referrals.affiliate_id and a.user_id=(select auth.uid())));
grant select on public.discount_coupons,public.affiliates,public.coupon_redemptions,public.affiliate_referrals to authenticated;
revoke insert,update,delete on public.discount_coupons,public.affiliates,public.coupon_redemptions,public.affiliate_referrals from anon,authenticated;

create or replace function public.create_beat_order_with_promotions(
 target_buyer_id uuid,target_license_ids uuid[],target_coupon_code text default null,target_affiliate_code text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare l record;c record;a record;oid uuid:=gen_random_uuid();subtotal integer;discount integer:=0;
 total integer;cnt integer;i integer:=0;allocated integer:=0;item_amount integer;curr text;
begin
 if target_buyer_id is null or coalesce(array_length(target_license_ids,1),0)<1 or array_length(target_license_ids,1)>20 then raise exception 'Select between 1 and 20 licenses';end if;
 if array_length(target_license_ids,1)<>(select count(distinct x) from unnest(target_license_ids)x) then raise exception 'Duplicate licenses are not allowed';end if;
 select count(*),sum(bl.price_cents)::integer,min(bl.currency) into cnt,subtotal,curr from public.beat_licenses bl join public.beats b on b.id=bl.beat_id
 where bl.id=any(target_license_ids) and bl.available and b.status='published';
 if cnt<>array_length(target_license_ids,1) then raise exception 'One or more licenses are unavailable';end if;
 if (select count(distinct currency) from public.beat_licenses where id=any(target_license_ids))<>1 then raise exception 'Mixed currencies are not supported';end if;
 if nullif(upper(trim(target_coupon_code)),'') is not null then
  select * into c from public.discount_coupons where code=upper(trim(target_coupon_code)) for update;
  if c.id is null or not c.active or c.starts_at>now() or (c.ends_at is not null and c.ends_at<=now()) or subtotal<c.minimum_amount_cents then raise exception 'Coupon is invalid or unavailable';end if;
  if c.usage_limit is not null and (select count(*) from public.coupon_redemptions where coupon_id=c.id and status in('reserved','redeemed'))>=c.usage_limit then raise exception 'Coupon usage limit reached';end if;
  if (select count(*) from public.coupon_redemptions where coupon_id=c.id and user_id=target_buyer_id and status in('reserved','redeemed'))>=c.per_user_limit then raise exception 'Coupon already used by this user';end if;
  discount:=case when c.discount_type='percent' then (subtotal*c.discount_value)/10000 else c.discount_value end;
  discount:=least(discount,coalesce(c.maximum_discount_cents,discount),subtotal-1);
 end if;
 total:=subtotal-discount;
 if nullif(upper(trim(target_affiliate_code)),'') is not null then
  select * into a from public.affiliates where code=upper(trim(target_affiliate_code)) and status='active';
  if a.id is null then raise exception 'Affiliate code is invalid';end if;
  if a.user_id=target_buyer_id then raise exception 'Self-referral is not allowed';end if;
 end if;
 insert into public.beat_orders(id,buyer_id,status,provider,amount_cents,subtotal_cents,discount_cents,currency,coupon_id,affiliate_id)
 values(oid,target_buyer_id,'pending','stripe',total,subtotal,discount,curr,c.id,a.id);
 for l in select bl.id,bl.beat_id,bl.price_cents,bl.currency,b.producer_id from public.beat_licenses bl join public.beats b on b.id=bl.beat_id where bl.id=any(target_license_ids) order by bl.id loop
  i:=i+1;item_amount:=case when i=cnt then total-allocated else(l.price_cents*total)/subtotal end;allocated:=allocated+item_amount;
  insert into public.beat_order_items(order_id,beat_id,license_id,producer_id,list_price_cents,amount_cents,currency)
  values(oid,l.beat_id,l.id,l.producer_id,l.price_cents,item_amount,l.currency);
 end loop;
 if c.id is not null then insert into public.coupon_redemptions(coupon_id,order_id,user_id,discount_cents) values(c.id,oid,target_buyer_id,discount);end if;
 if a.id is not null then insert into public.affiliate_referrals(affiliate_id,order_id,buyer_id,commission_bps,commission_cents)
 values(a.id,oid,target_buyer_id,a.commission_bps,(total*a.commission_bps)/10000);end if;
 return jsonb_build_object('order_id',oid,'subtotal_cents',subtotal,'discount_cents',discount,'amount_cents',total,'currency',curr);
end;$$;
revoke execute on function public.create_beat_order_with_promotions(uuid,uuid[],text,text) from public,anon,authenticated;
grant execute on function public.create_beat_order_with_promotions(uuid,uuid[],text,text) to service_role;

create or replace function public.sync_order_promotions_after_status() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status='paid' and old.status is distinct from new.status then update public.coupon_redemptions set status='redeemed',redeemed_at=now() where order_id=new.id and status='reserved';
 elsif new.status in('canceled','refunded') and old.status is distinct from new.status then
  update public.coupon_redemptions set status='released' where order_id=new.id and status='reserved';
  if new.status='refunded' then update public.affiliate_referrals set status='reversed' where order_id=new.id and status in('pending','approved');end if;
 end if;return new;
end;$$;
revoke all on function public.sync_order_promotions_after_status() from public,anon,authenticated;
create trigger sync_order_promotions_after_status after update of status on public.beat_orders for each row execute function public.sync_order_promotions_after_status();
