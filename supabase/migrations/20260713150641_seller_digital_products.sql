create table public.seller_products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  product_type text not null check (product_type in ('preset','drum_kit','midi','plugin','template','project','ebook','other')),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(btrim(title)) between 3 and 160),
  description text,
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'BRL' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  cover_url text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.seller_product_files (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.seller_products(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint not null check (size_bytes > 0),
  created_at timestamptz not null default now()
);

create table public.digital_product_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','paid','canceled','refunded','disputed')),
  provider text not null,
  provider_session_id text unique,
  provider_payment_id text unique,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'BRL' check (currency ~ '^[A-Z]{3}$'),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.digital_product_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.digital_product_orders(id) on delete restrict,
  product_id uuid not null references public.seller_products(id) on delete restrict,
  seller_id uuid not null references auth.users(id) on delete restrict,
  product_title_snapshot text not null,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (order_id, product_id)
);

create index seller_products_seller_status_created_idx on public.seller_products (seller_id, status, created_at desc);
create index seller_products_public_catalog_idx on public.seller_products (status, product_type, published_at desc);
create index seller_product_files_product_idx on public.seller_product_files (product_id);
create index digital_product_orders_buyer_created_idx on public.digital_product_orders (buyer_id, created_at desc);
create index digital_product_order_items_seller_created_idx on public.digital_product_order_items (seller_id, created_at desc);
create index digital_product_order_items_order_idx on public.digital_product_order_items (order_id);
create index digital_product_order_items_product_idx on public.digital_product_order_items (product_id);

alter table public.seller_products enable row level security;
alter table public.seller_product_files enable row level security;
alter table public.digital_product_orders enable row level security;
alter table public.digital_product_order_items enable row level security;

create policy "Published seller products are public" on public.seller_products for select using (status = 'published');
create policy "Sellers view own products" on public.seller_products for select to authenticated using (seller_id = (select auth.uid()));
create policy "Sellers create own products" on public.seller_products for insert to authenticated with check (seller_id = (select auth.uid()));
create policy "Sellers update own products" on public.seller_products for update to authenticated using (seller_id = (select auth.uid())) with check (seller_id = (select auth.uid()));
create policy "Sellers delete own draft products" on public.seller_products for delete to authenticated using (seller_id = (select auth.uid()) and status = 'draft');

create policy "Sellers manage own product files" on public.seller_product_files for all to authenticated
using (exists (select 1 from public.seller_products p where p.id = product_id and p.seller_id = (select auth.uid())))
with check (exists (select 1 from public.seller_products p where p.id = product_id and p.seller_id = (select auth.uid())));
create policy "Paid buyers view product file metadata" on public.seller_product_files for select to authenticated
using (exists (select 1 from public.digital_product_order_items i join public.digital_product_orders o on o.id=i.order_id where i.product_id=seller_product_files.product_id and o.buyer_id=(select auth.uid()) and o.status='paid'));

create policy "Buyers view own digital product orders" on public.digital_product_orders for select to authenticated using (buyer_id = (select auth.uid()));
create policy "Buyers view own digital product order items" on public.digital_product_order_items for select to authenticated
using (exists (select 1 from public.digital_product_orders o where o.id=order_id and o.buyer_id=(select auth.uid())));
create policy "Sellers view own digital product order items" on public.digital_product_order_items for select to authenticated using (seller_id=(select auth.uid()));

create trigger update_seller_products_updated_at before update on public.seller_products for each row execute function public.update_updated_at_column();
create trigger update_digital_product_orders_updated_at before update on public.digital_product_orders for each row execute function public.update_updated_at_column();

create or replace function public.validate_seller_product_publication()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.status='published' and old.status is distinct from 'published' then
    if char_length(btrim(coalesce(new.description,''))) < 20 then raise exception 'Product description must contain at least 20 characters before publication'; end if;
    if not exists (select 1 from public.seller_product_files f where f.product_id=new.id) then raise exception 'Product requires at least one delivery file before publication'; end if;
    new.published_at=coalesce(new.published_at,now());
  end if;
  return new;
end;
$$;
revoke all on function public.validate_seller_product_publication() from public;
create trigger validate_seller_product_before_publication before update of status on public.seller_products for each row execute function public.validate_seller_product_publication();

insert into storage.buckets (id,name,public,file_size_limit)
values ('seller-product-files','seller-product-files',false,524288000)
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit;

create policy "Sellers upload own product files" on storage.objects for insert to authenticated with check (
  bucket_id='seller-product-files' and (storage.foldername(name))[1]=(select auth.uid())::text
  and exists (select 1 from public.seller_products p where p.id::text=(storage.foldername(name))[2] and p.seller_id=(select auth.uid()))
);
create policy "Sellers view own product files" on storage.objects for select to authenticated using (bucket_id='seller-product-files' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Sellers delete own product files" on storage.objects for delete to authenticated using (bucket_id='seller-product-files' and (storage.foldername(name))[1]=(select auth.uid())::text);

grant select on public.seller_products to anon;
grant select,insert,update,delete on public.seller_products to authenticated;
grant select,insert,update,delete on public.seller_product_files to authenticated;
grant select on public.digital_product_orders, public.digital_product_order_items to authenticated;
