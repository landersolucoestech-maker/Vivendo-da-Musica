-- Consolidate checkout parent orders while remaining compatible with the
-- historical course, beat and digital-product checkout schemas.

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

-- Historical parent tables predate provider_reference/is_demo and use Auth FKs.
-- Keep their original provider identifiers and add the normalized fields.
alter table public.course_orders
  add column if not exists provider_reference text,
  add column if not exists is_demo boolean not null default false;

alter table public.beat_orders
  add column if not exists provider_reference text,
  add column if not exists is_demo boolean not null default false;

alter table public.digital_product_orders
  add column if not exists provider_reference text,
  add column if not exists is_demo boolean not null default false;

alter table public.beat_orders alter column buyer_id drop not null;
alter table public.digital_product_orders alter column buyer_id drop not null;
alter table public.beat_orders alter column provider set default 'manual';
alter table public.digital_product_orders alter column provider set default 'manual';

-- Preserve the historical provider IDs as the normalized reference where one
-- exists, without deleting or renaming the legacy columns.
do $migration$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='course_orders' and column_name='provider_session_id'
  ) then
    execute 'update public.course_orders set provider_reference = coalesce(provider_reference, provider_session_id, provider_payment_id)';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='beat_orders' and column_name='provider_session_id'
  ) then
    execute 'update public.beat_orders set provider_reference = coalesce(provider_reference, provider_session_id, provider_payment_id)';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='digital_product_orders' and column_name='provider_session_id'
  ) then
    execute 'update public.digital_product_orders set provider_reference = coalesce(provider_reference, provider_session_id, provider_payment_id)';
  end if;
end
$migration$;

-- Expand the historical enum contracts to the normalized checkout state set.
do $migration$
begin
  if exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid=t.typnamespace
    where n.nspname='public' and t.typname='course_order_status'
  ) then
    execute 'alter type public.course_order_status add value if not exists ''disputed''';
  end if;

  if exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid=t.typnamespace
    where n.nspname='public' and t.typname='beat_order_status'
  ) then
    execute 'alter type public.beat_order_status add value if not exists ''disputed''';
  end if;
end
$migration$;

-- Historical course items did not retain title/currency snapshots.
alter table public.course_order_items
  add column if not exists course_title_snapshot text,
  add column if not exists currency text not null default 'BRL';

update public.course_order_items item
set course_title_snapshot = coalesce(item.course_title_snapshot, course.title)
from public.courses course
where course.id = item.course_id
  and item.course_title_snapshot is null;

update public.course_order_items
set course_title_snapshot = 'Curso'
where course_title_snapshot is null;

alter table public.course_order_items
  alter column course_title_snapshot set not null;

alter table public.beat_order_items
  add column if not exists order_id uuid references public.beat_orders(id) on delete cascade;

alter table public.digital_product_order_items
  add column if not exists order_id uuid references public.digital_product_orders(id) on delete cascade;

-- Create one parent per orphan beat item. The historical parent uses an enum,
-- while the current Supabase dev branch uses text; dynamic SQL handles both.
do $migration$
declare
  item record;
  new_order_id uuid;
  status_udt text;
  safe_buyer_id uuid;
begin
  select columns.udt_name
  into status_udt
  from information_schema.columns columns
  where columns.table_schema='public'
    and columns.table_name='beat_orders'
    and columns.column_name='status';

  for item in
    select id, buyer_id, status, amount_cents, currency, paid_at, created_at
    from public.beat_order_items
    where order_id is null
    order by created_at, id
  loop
    select case
      when item.buyer_id is null then null
      when exists (select 1 from auth.users user_row where user_row.id=item.buyer_id) then item.buyer_id
      when exists (select 1 from public.user_profiles profile where profile.user_id=item.buyer_id)
           and not exists (
             select 1
             from pg_constraint constraint_row
             join pg_class source_table on source_table.oid=constraint_row.conrelid
             join pg_namespace source_schema on source_schema.oid=source_table.relnamespace
             join pg_class target_table on target_table.oid=constraint_row.confrelid
             join pg_namespace target_schema on target_schema.oid=target_table.relnamespace
             where constraint_row.contype='f'
               and source_schema.nspname='public'
               and source_table.relname='beat_orders'
               and target_schema.nspname='auth'
               and target_table.relname='users'
           ) then item.buyer_id
      else null
    end
    into safe_buyer_id;

    if status_udt='beat_order_status' then
      execute $sql$
        insert into public.beat_orders (
          buyer_id,status,provider,amount_cents,currency,is_demo,paid_at,created_at
        ) values ($1,$2::public.beat_order_status,'development',$3,$4,true,$5,$6)
        returning id
      $sql$
      into new_order_id
      using safe_buyer_id, item.status, item.amount_cents, item.currency, item.paid_at, item.created_at;
    else
      insert into public.beat_orders (
        buyer_id,status,provider,amount_cents,currency,is_demo,paid_at,created_at
      ) values (
        safe_buyer_id,item.status,'development',item.amount_cents,item.currency,true,item.paid_at,item.created_at
      )
      returning id into new_order_id;
    end if;

    update public.beat_order_items
    set order_id=new_order_id
    where id=item.id;
  end loop;
end
$migration$;

-- Create one parent per orphan digital-product item. Its historical status is
-- text, but the branch is inspected rather than assumed.
do $migration$
declare
  item record;
  new_order_id uuid;
  status_udt text;
  safe_buyer_id uuid;
begin
  select columns.udt_name
  into status_udt
  from information_schema.columns columns
  where columns.table_schema='public'
    and columns.table_name='digital_product_orders'
    and columns.column_name='status';

  for item in
    select id, buyer_id, status, amount_cents, currency, paid_at, created_at
    from public.digital_product_order_items
    where order_id is null
    order by created_at, id
  loop
    select case
      when item.buyer_id is null then null
      when exists (select 1 from auth.users user_row where user_row.id=item.buyer_id) then item.buyer_id
      when exists (select 1 from public.user_profiles profile where profile.user_id=item.buyer_id)
           and not exists (
             select 1
             from pg_constraint constraint_row
             join pg_class source_table on source_table.oid=constraint_row.conrelid
             join pg_namespace source_schema on source_schema.oid=source_table.relnamespace
             join pg_class target_table on target_table.oid=constraint_row.confrelid
             join pg_namespace target_schema on target_schema.oid=target_table.relnamespace
             where constraint_row.contype='f'
               and source_schema.nspname='public'
               and source_table.relname='digital_product_orders'
               and target_schema.nspname='auth'
               and target_table.relname='users'
           ) then item.buyer_id
      else null
    end
    into safe_buyer_id;

    if status_udt='digital_product_order_status' then
      execute $sql$
        insert into public.digital_product_orders (
          buyer_id,status,provider,amount_cents,currency,is_demo,paid_at,created_at
        ) values ($1,$2::public.digital_product_order_status,'development',$3,$4,true,$5,$6)
        returning id
      $sql$
      into new_order_id
      using safe_buyer_id, item.status, item.amount_cents, item.currency, item.paid_at, item.created_at;
    else
      insert into public.digital_product_orders (
        buyer_id,status,provider,amount_cents,currency,is_demo,paid_at,created_at
      ) values (
        safe_buyer_id,item.status,'development',item.amount_cents,item.currency,true,item.paid_at,item.created_at
      )
      returning id into new_order_id;
    end if;

    update public.digital_product_order_items
    set order_id=new_order_id
    where id=item.id;
  end loop;
end
$migration$;

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
