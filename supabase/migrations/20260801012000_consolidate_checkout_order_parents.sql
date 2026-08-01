create table if not exists public.course_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(user_id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','paid','canceled','refunded','disputed')),
  provider text not null default 'manual',
  provider_reference text,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'BRL',
  is_demo boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.course_orders(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete restrict,
  course_title_snapshot text not null,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'BRL',
  created_at timestamptz not null default now(),
  unique(order_id, course_id)
);

create table if not exists public.beat_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references public.user_profiles(user_id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','paid','canceled','refunded','disputed')),
  provider text not null default 'manual',
  provider_reference text,
  amount_cents integer not null default 0 check (amount_cents >= 0),
  currency text not null default 'BRL',
  is_demo boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.digital_product_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references public.user_profiles(user_id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','paid','canceled','refunded','disputed')),
  provider text not null default 'manual',
  provider_reference text,
  amount_cents integer not null default 0 check (amount_cents >= 0),
  currency text not null default 'BRL',
  is_demo boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.beat_order_items add column if not exists order_id uuid references public.beat_orders(id) on delete cascade;
alter table public.digital_product_order_items add column if not exists order_id uuid references public.digital_product_orders(id) on delete cascade;

with created as (
  insert into public.beat_orders (buyer_id,status,provider,amount_cents,currency,is_demo,paid_at,created_at)
  select buyer_id,status,'development',amount_cents,currency,true,paid_at,created_at
  from public.beat_order_items where order_id is null
  returning id,created_at
), ranked_items as (
  select id,row_number() over(order by created_at,id) rn from public.beat_order_items where order_id is null
), ranked_orders as (
  select id,row_number() over(order by created_at,id) rn from created
)
update public.beat_order_items i set order_id=o.id
from ranked_items ri join ranked_orders o using(rn)
where i.id=ri.id;

with created as (
  insert into public.digital_product_orders (buyer_id,status,provider,amount_cents,currency,is_demo,paid_at,created_at)
  select buyer_id,status,'development',amount_cents,currency,true,paid_at,created_at
  from public.digital_product_order_items where order_id is null
  returning id,created_at
), ranked_items as (
  select id,row_number() over(order by created_at,id) rn from public.digital_product_order_items where order_id is null
), ranked_orders as (
  select id,row_number() over(order by created_at,id) rn from created
)
update public.digital_product_order_items i set order_id=o.id
from ranked_items ri join ranked_orders o using(rn)
where i.id=ri.id;

alter table public.beat_order_items alter column order_id set not null;
alter table public.digital_product_order_items alter column order_id set not null;

create index if not exists idx_course_orders_user on public.course_orders(user_id,created_at desc);
create index if not exists idx_course_order_items_order on public.course_order_items(order_id);
create index if not exists idx_beat_orders_buyer on public.beat_orders(buyer_id,created_at desc);
create index if not exists idx_beat_order_items_order on public.beat_order_items(order_id);
create index if not exists idx_digital_product_orders_buyer on public.digital_product_orders(buyer_id,created_at desc);
create index if not exists idx_digital_product_order_items_order on public.digital_product_order_items(order_id);

alter table public.course_orders enable row level security;
alter table public.course_order_items enable row level security;
alter table public.beat_orders enable row level security;
alter table public.digital_product_orders enable row level security;

drop policy if exists course_orders_owner_read on public.course_orders;
create policy course_orders_owner_read on public.course_orders for select to authenticated using (user_id=auth.uid());
drop policy if exists course_order_items_owner_read on public.course_order_items;
create policy course_order_items_owner_read on public.course_order_items for select to authenticated using (exists(select 1 from public.course_orders o where o.id=order_id and o.user_id=auth.uid()));
drop policy if exists beat_orders_owner_read on public.beat_orders;
create policy beat_orders_owner_read on public.beat_orders for select to authenticated using (buyer_id=auth.uid());
drop policy if exists digital_product_orders_owner_read on public.digital_product_orders;
create policy digital_product_orders_owner_read on public.digital_product_orders for select to authenticated using (buyer_id=auth.uid());

drop policy if exists demo_course_orders_read on public.course_orders;
create policy demo_course_orders_read on public.course_orders for select to anon using (is_demo);
drop policy if exists demo_course_order_items_read on public.course_order_items;
create policy demo_course_order_items_read on public.course_order_items for select to anon using (exists(select 1 from public.course_orders o where o.id=order_id and o.is_demo));
drop policy if exists demo_beat_orders_read on public.beat_orders;
create policy demo_beat_orders_read on public.beat_orders for select to anon using (is_demo);
drop policy if exists demo_product_orders_read on public.digital_product_orders;
create policy demo_product_orders_read on public.digital_product_orders for select to anon using (is_demo);
