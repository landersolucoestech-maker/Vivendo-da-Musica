create table if not exists public.seller_products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.user_profiles(user_id) on delete restrict,
  title text not null check (char_length(title) between 3 and 180),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text not null check (char_length(description) between 20 and 5000),
  product_type text not null check (product_type in ('preset','drum_kit','midi','plugin','template','project','ebook','other')),
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'BRL' check (currency = 'BRL'),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  cover_url text,
  is_demo boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seller_product_files (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.seller_products(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 524288000),
  created_at timestamptz not null default now()
);

create table if not exists public.digital_product_order_items (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.seller_products(id) on delete restrict,
  seller_id uuid not null references public.user_profiles(user_id) on delete restrict,
  buyer_id uuid references public.user_profiles(user_id) on delete set null,
  product_title_snapshot text not null,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'BRL' check (currency = 'BRL'),
  status text not null default 'pending' check (status in ('pending','paid','canceled','refunded','disputed')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.seller_products enable row level security;
alter table public.seller_product_files enable row level security;
alter table public.digital_product_order_items enable row level security;

create policy seller_products_public_read on public.seller_products for select to anon, authenticated
using (status = 'published' or is_demo = true or seller_id = auth.uid() or is_platform_staff());
create policy seller_products_owner_write on public.seller_products for all to authenticated
using (seller_id = auth.uid() or is_platform_staff()) with check (seller_id = auth.uid() or is_platform_staff());
create policy seller_products_demo_write on public.seller_products for all to anon
using (is_demo = true and seller_id = '22222222-2222-4222-8222-222222222222'::uuid)
with check (is_demo = true and seller_id = '22222222-2222-4222-8222-222222222222'::uuid);

create policy seller_product_files_owner_read on public.seller_product_files for select to authenticated
using (exists (select 1 from public.seller_products p where p.id = product_id and (p.seller_id = auth.uid() or is_platform_staff())));
create policy seller_product_files_demo_read on public.seller_product_files for select to anon
using (exists (select 1 from public.seller_products p where p.id = product_id and p.is_demo = true));
create policy seller_product_files_owner_write on public.seller_product_files for all to authenticated
using (exists (select 1 from public.seller_products p where p.id = product_id and (p.seller_id = auth.uid() or is_platform_staff())))
with check (exists (select 1 from public.seller_products p where p.id = product_id and (p.seller_id = auth.uid() or is_platform_staff())));
create policy seller_product_files_demo_write on public.seller_product_files for all to anon
using (exists (select 1 from public.seller_products p where p.id = product_id and p.is_demo = true))
with check (exists (select 1 from public.seller_products p where p.id = product_id and p.is_demo = true));

create policy digital_product_orders_owner_read on public.digital_product_order_items for select to authenticated
using (buyer_id = auth.uid() or seller_id = auth.uid() or is_platform_staff());
create policy digital_product_orders_demo_read on public.digital_product_order_items for select to anon
using (seller_id = '22222222-2222-4222-8222-222222222222'::uuid or buyer_id = '11111111-1111-4111-8111-111111111111'::uuid);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('seller-product-files','seller-product-files',false,524288000,array['application/zip','application/x-zip-compressed','application/pdf','application/octet-stream','audio/midi','audio/x-midi','application/vnd.apple.installer+xml']::text[])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy seller_product_storage_demo_insert on storage.objects for insert to anon
with check (bucket_id='seller-product-files' and (storage.foldername(name))[1]='22222222-2222-4222-8222-222222222222');
create policy seller_product_storage_demo_update on storage.objects for update to anon
using (bucket_id='seller-product-files' and (storage.foldername(name))[1]='22222222-2222-4222-8222-222222222222')
with check (bucket_id='seller-product-files' and (storage.foldername(name))[1]='22222222-2222-4222-8222-222222222222');
create policy seller_product_storage_demo_delete on storage.objects for delete to anon
using (bucket_id='seller-product-files' and (storage.foldername(name))[1]='22222222-2222-4222-8222-222222222222');
create policy seller_product_storage_owner_all on storage.objects for all to authenticated
using (bucket_id='seller-product-files' and ((storage.foldername(name))[1]=auth.uid()::text or is_platform_staff()))
with check (bucket_id='seller-product-files' and ((storage.foldername(name))[1]=auth.uid()::text or is_platform_staff()));

create index if not exists seller_products_seller_status_idx on public.seller_products(seller_id,status,created_at desc);
create index if not exists seller_product_files_product_idx on public.seller_product_files(product_id);
create index if not exists digital_product_order_items_seller_idx on public.digital_product_order_items(seller_id,created_at desc);
create index if not exists digital_product_order_items_buyer_idx on public.digital_product_order_items(buyer_id,created_at desc);

insert into public.seller_products (id,seller_id,title,slug,description,product_type,price_cents,status,is_demo,published_at) values
('db100000-0000-4000-8000-000000000001','22222222-2222-4222-8222-222222222222','Afrobeat Sample Pack','afrobeat-sample-pack','Coleção de loops, one-shots e elementos rítmicos preparados para produção musical.','drum_kit',7900,'published',true,now()-interval '10 days'),
('db100000-0000-4000-8000-000000000002','22222222-2222-4222-8222-222222222222','Template de Mixagem Profissional','template-mixagem-profissional','Template organizado para acelerar sessões de mixagem e padronizar o fluxo de trabalho.','template',11900,'published',true,now()-interval '6 days'),
('db100000-0000-4000-8000-000000000003','22222222-2222-4222-8222-222222222222','Guia de Produção Musical','guia-producao-musical','Material digital de apoio com fundamentos, exercícios e checklist de produção musical.','ebook',4900,'draft',true,null)
on conflict (id) do nothing;

insert into public.seller_product_files (id,product_id,storage_path,file_name,mime_type,size_bytes) values
('db200000-0000-4000-8000-000000000001','db100000-0000-4000-8000-000000000001','22222222-2222-4222-8222-222222222222/db100000-0000-4000-8000-000000000001/afrobeat-sample-pack.zip','afrobeat-sample-pack.zip','application/zip',10485760),
('db200000-0000-4000-8000-000000000002','db100000-0000-4000-8000-000000000002','22222222-2222-4222-8222-222222222222/db100000-0000-4000-8000-000000000002/template-mixagem.zip','template-mixagem.zip','application/zip',7340032)
on conflict (id) do nothing;

insert into public.digital_product_order_items (id,product_id,seller_id,buyer_id,product_title_snapshot,amount_cents,status,paid_at,created_at) values
('db300000-0000-4000-8000-000000000001','db100000-0000-4000-8000-000000000001','22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','Afrobeat Sample Pack',7900,'paid',now()-interval '4 days',now()-interval '4 days'),
('db300000-0000-4000-8000-000000000002','db100000-0000-4000-8000-000000000002','22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','Template de Mixagem Profissional',11900,'paid',now()-interval '2 days',now()-interval '2 days')
on conflict (id) do nothing;
