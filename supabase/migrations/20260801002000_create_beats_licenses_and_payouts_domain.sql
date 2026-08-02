-- Domínio de beats aplicado no Supabase dev.
-- A migration também reconcilia o marketplace histórico criado em julho: quando
-- as tabelas já existem, adiciona e preenche o contrato exigido pelo portal novo.

create table if not exists public.beats (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references public.user_profiles(user_id) on delete restrict,
  slug text not null unique,
  title text not null check (char_length(title) between 2 and 180),
  description text,
  genre text not null,
  bpm integer check (bpm between 30 and 300),
  musical_key text,
  mood text,
  duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
  cover_url text,
  preview_file_path text,
  master_file_path text,
  stems_file_path text,
  copyright_status text not null default 'pending' check (copyright_status in ('pending','registered','failed')),
  copyright_evidence_id text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  exclusive_available boolean not null default true,
  is_demo boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.beat_licenses (
  id uuid primary key default gen_random_uuid(),
  beat_id uuid not null references public.beats(id) on delete cascade,
  license_type text not null check (license_type in ('basic','premium','unlimited','exclusive')),
  name text not null,
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'BRL',
  deliverables jsonb not null default '[]'::jsonb,
  usage_rights jsonb not null default '[]'::jsonb,
  max_copies integer,
  is_exclusive boolean not null default false,
  available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (beat_id, license_type)
);

create table if not exists public.beat_events (
  id uuid primary key default gen_random_uuid(),
  beat_id uuid not null references public.beats(id) on delete cascade,
  event_type text not null check (event_type in ('view','play','add_to_cart','checkout','purchase')),
  user_id uuid references public.user_profiles(user_id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.beat_order_items (
  id uuid primary key default gen_random_uuid(),
  beat_id uuid not null references public.beats(id) on delete restrict,
  license_id uuid not null references public.beat_licenses(id) on delete restrict,
  producer_id uuid not null references public.user_profiles(user_id) on delete restrict,
  buyer_id uuid references public.user_profiles(user_id) on delete set null,
  beat_title_snapshot text not null,
  license_name_snapshot text not null,
  buyer_name_snapshot text not null default 'Comprador',
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'BRL',
  status text not null default 'pending' check (status in ('pending','paid','refunded','disputed','canceled')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.beat_license_purchases (
  id uuid primary key default gen_random_uuid(),
  beat_order_item_id uuid not null unique references public.beat_order_items(id) on delete restrict,
  beat_id uuid not null references public.beats(id) on delete restrict,
  license_id uuid not null references public.beat_licenses(id) on delete restrict,
  buyer_id uuid references public.user_profiles(user_id) on delete set null,
  contract_number text not null unique,
  status text not null default 'active' check (status in ('active','revoked','refunded')),
  issued_at timestamptz not null default now()
);

create table if not exists public.beat_deliveries (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.beat_license_purchases(id) on delete cascade,
  file_label text not null,
  storage_bucket text not null,
  storage_path text not null,
  expires_at timestamptz,
  downloaded_at timestamptz,
  download_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_financial_settings (
  id boolean primary key default true check (id),
  default_commission_bps integer not null default 1500,
  payout_minimum_cents integer not null default 5000,
  payout_delay_days integer not null default 14,
  updated_at timestamptz not null default now()
);

create table if not exists public.producer_financial_accounts (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null unique references public.user_profiles(user_id) on delete restrict,
  currency text not null default 'BRL',
  current_balance_cents bigint not null default 0,
  eligible_balance_cents bigint not null default 0,
  next_eligibility_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.producer_payout_methods (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references public.user_profiles(user_id) on delete cascade,
  method_type text not null check (method_type in ('pix','bank_account')),
  display_label text not null,
  is_default boolean not null default false,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.producer_payout_requests (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references public.user_profiles(user_id) on delete restrict,
  payout_method_id uuid not null references public.producer_payout_methods(id) on delete restrict,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'BRL',
  status text not null default 'requested' check (status in ('requested','processing','paid','failed','canceled')),
  requested_at timestamptz not null default now(),
  processed_at timestamptz
);

-- Compatibilidade com o domínio histórico de beats.
alter table public.beats
  add column if not exists copyright_evidence_id text,
  add column if not exists is_demo boolean not null default false;

alter table public.beat_order_items
  add column if not exists buyer_id uuid,
  add column if not exists beat_title_snapshot text,
  add column if not exists license_name_snapshot text,
  add column if not exists buyer_name_snapshot text not null default 'Comprador',
  add column if not exists status text not null default 'pending',
  add column if not exists paid_at timestamptz;

do $compatibility$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='beat_order_items' and column_name='order_id'
  ) then
    execute $sql$
      update public.beat_order_items item
      set buyer_id = coalesce(item.buyer_id, parent.buyer_id),
          beat_title_snapshot = coalesce(item.beat_title_snapshot, beat.title),
          license_name_snapshot = coalesce(item.license_name_snapshot, license.name),
          status = coalesce(nullif(item.status, ''), parent.status::text),
          paid_at = coalesce(item.paid_at, parent.paid_at)
      from public.beats beat,
           public.beat_licenses license,
           public.beat_orders parent
      where beat.id = item.beat_id
        and license.id = item.license_id
        and parent.id = item.order_id
    $sql$;
  end if;
end
$compatibility$;

update public.beat_order_items item
set beat_title_snapshot = coalesce(item.beat_title_snapshot, beat.title),
    license_name_snapshot = coalesce(item.license_name_snapshot, license.name),
    buyer_name_snapshot = coalesce(nullif(item.buyer_name_snapshot, ''), 'Comprador')
from public.beats beat,
     public.beat_licenses license
where beat.id = item.beat_id
  and license.id = item.license_id;

alter table public.beat_order_items
  alter column beat_title_snapshot set not null,
  alter column license_name_snapshot set not null,
  alter column buyer_name_snapshot set not null,
  alter column status set not null;

alter table public.beat_license_purchases
  add column if not exists beat_order_item_id uuid,
  add column if not exists contract_number text;

do $compatibility$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='beat_license_purchases' and column_name='order_item_id'
  ) then
    execute 'update public.beat_license_purchases set beat_order_item_id = coalesce(beat_order_item_id, order_item_id)';
  end if;
end
$compatibility$;

update public.beat_license_purchases
set contract_number = coalesce(
  nullif(contract_number, ''),
  'VDM-BEAT-' || upper(substr(replace(id::text, '-', ''), 1, 16))
);

alter table public.beat_license_purchases
  alter column beat_order_item_id set not null,
  alter column contract_number set not null;

create unique index if not exists beat_license_purchases_beat_order_item_id_uidx
  on public.beat_license_purchases(beat_order_item_id);
create unique index if not exists beat_license_purchases_contract_number_uidx
  on public.beat_license_purchases(contract_number);

alter table public.beat_deliveries
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists download_count integer not null default 0;

do $compatibility$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='beat_deliveries' and column_name='file_path'
  ) then
    execute $sql$
      update public.beat_deliveries
      set storage_bucket = coalesce(storage_bucket, 'beat-masters'),
          storage_path = coalesce(storage_path, file_path)
    $sql$;
  end if;
end
$compatibility$;

update public.beat_deliveries
set storage_bucket = coalesce(storage_bucket, 'beat-masters'),
    storage_path = coalesce(storage_path, id::text);

alter table public.beat_deliveries
  alter column storage_bucket set not null,
  alter column storage_path set not null;

alter table public.beats enable row level security;
alter table public.beat_licenses enable row level security;
alter table public.beat_events enable row level security;
alter table public.beat_order_items enable row level security;
alter table public.beat_license_purchases enable row level security;
alter table public.beat_deliveries enable row level security;
alter table public.platform_financial_settings enable row level security;
alter table public.producer_financial_accounts enable row level security;
alter table public.producer_payout_methods enable row level security;
alter table public.producer_payout_requests enable row level security;

create policy beats_public_read on public.beats for select to anon, authenticated using (status='published' or is_demo=true or producer_id=auth.uid() or is_platform_staff());
create policy beats_owner_write on public.beats for all to authenticated using (producer_id=auth.uid() or is_platform_staff()) with check (producer_id=auth.uid() or is_platform_staff());
create policy beats_demo_write on public.beats for all to anon using (is_demo=true and producer_id='22222222-2222-4222-8222-222222222222') with check (is_demo=true and producer_id='22222222-2222-4222-8222-222222222222');
create policy beat_licenses_public_read on public.beat_licenses for select to anon, authenticated using (exists(select 1 from public.beats b where b.id=beat_id and (b.status='published' or b.is_demo=true or b.producer_id=auth.uid() or is_platform_staff())));
create policy beat_licenses_owner_write on public.beat_licenses for all to authenticated using (exists(select 1 from public.beats b where b.id=beat_id and (b.producer_id=auth.uid() or is_platform_staff()))) with check (exists(select 1 from public.beats b where b.id=beat_id and (b.producer_id=auth.uid() or is_platform_staff())));
create policy beat_licenses_demo_write on public.beat_licenses for all to anon using (exists(select 1 from public.beats b where b.id=beat_id and b.is_demo=true)) with check (exists(select 1 from public.beats b where b.id=beat_id and b.is_demo=true));
create policy beat_events_public_insert on public.beat_events for insert to anon, authenticated with check (exists(select 1 from public.beats b where b.id=beat_id and b.status='published'));
create policy beat_events_owner_read on public.beat_events for select to authenticated using (exists(select 1 from public.beats b where b.id=beat_id and (b.producer_id=auth.uid() or is_platform_staff())));
create policy beat_events_demo_read on public.beat_events for select to anon using (exists(select 1 from public.beats b where b.id=beat_id and b.is_demo=true));
create policy beat_orders_owner_read on public.beat_order_items for select to authenticated using (producer_id=auth.uid() or buyer_id=auth.uid() or is_platform_staff());
create policy beat_orders_demo_read on public.beat_order_items for select to anon using (producer_id='22222222-2222-4222-8222-222222222222' or buyer_id='11111111-1111-4111-8111-111111111111');
create policy beat_purchases_owner_read on public.beat_license_purchases for select to authenticated using (buyer_id=auth.uid() or exists(select 1 from public.beats b where b.id=beat_id and b.producer_id=auth.uid()) or is_platform_staff());
create policy beat_purchases_demo_read on public.beat_license_purchases for select to anon using (exists(select 1 from public.beats b where b.id=beat_id and b.is_demo=true));
create policy beat_deliveries_owner_read on public.beat_deliveries for select to authenticated using (exists(select 1 from public.beat_license_purchases p where p.id=purchase_id and (p.buyer_id=auth.uid() or is_platform_staff())));
create policy beat_deliveries_demo_read on public.beat_deliveries for select to anon using (exists(select 1 from public.beat_license_purchases p join public.beats b on b.id=p.beat_id where p.id=purchase_id and b.is_demo=true));
create policy financial_settings_read on public.platform_financial_settings for select to anon, authenticated using (true);
create policy producer_accounts_owner_read on public.producer_financial_accounts for select to authenticated using (producer_id=auth.uid() or is_platform_staff());
create policy producer_accounts_demo_read on public.producer_financial_accounts for select to anon using (producer_id='22222222-2222-4222-8222-222222222222');
create policy payout_methods_owner_read on public.producer_payout_methods for select to authenticated using (producer_id=auth.uid() or is_platform_staff());
create policy payout_methods_demo_read on public.producer_payout_methods for select to anon using (producer_id='22222222-2222-4222-8222-222222222222');
create policy payout_requests_owner_read on public.producer_payout_requests for select to authenticated using (producer_id=auth.uid() or is_platform_staff());
create policy payout_requests_demo_read on public.producer_payout_requests for select to anon using (producer_id='22222222-2222-4222-8222-222222222222');

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('beat-previews','beat-previews',true,52428800,array['audio/mpeg','audio/wav','audio/x-wav']::text[]),
('beat-masters','beat-masters',false,524288000,array['audio/wav','audio/x-wav','audio/mpeg']::text[]),
('beat-stems','beat-stems',false,1073741824,array['application/zip','application/x-zip-compressed']::text[])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy beat_storage_demo_insert on storage.objects for insert to anon with check (bucket_id in ('beat-previews','beat-masters','beat-stems') and (storage.foldername(name))[1]='22222222-2222-4222-8222-222222222222');
create policy beat_storage_demo_update on storage.objects for update to anon using (bucket_id in ('beat-previews','beat-masters','beat-stems') and (storage.foldername(name))[1]='22222222-2222-4222-8222-222222222222') with check (bucket_id in ('beat-previews','beat-masters','beat-stems') and (storage.foldername(name))[1]='22222222-2222-4222-8222-222222222222');
create policy beat_storage_demo_delete on storage.objects for delete to anon using (bucket_id in ('beat-previews','beat-masters','beat-stems') and (storage.foldername(name))[1]='22222222-2222-4222-8222-222222222222');
create policy beat_storage_owner_all on storage.objects for all to authenticated using (bucket_id in ('beat-previews','beat-masters','beat-stems') and ((storage.foldername(name))[1]=auth.uid()::text or is_platform_staff())) with check (bucket_id in ('beat-previews','beat-masters','beat-stems') and ((storage.foldername(name))[1]=auth.uid()::text or is_platform_staff()));

insert into public.platform_financial_settings(id)
values(true)
on conflict(id) do nothing;

insert into public.producer_financial_accounts(
  id,producer_id,current_balance_cents,eligible_balance_cents
)
select
  'bf100000-0000-4000-8000-000000000001'::uuid,
  profile.user_id,
  34700,
  34700
from public.user_profiles profile
where profile.user_id='22222222-2222-4222-8222-222222222222'::uuid
on conflict(producer_id) do nothing;

insert into public.producer_payout_methods(
  id,producer_id,method_type,display_label,is_default,verified
)
select
  'bf200000-0000-4000-8000-000000000001'::uuid,
  account.producer_id,
  'pix',
  'Pix de desenvolvimento',
  true,
  true
from public.producer_financial_accounts account
where account.producer_id='22222222-2222-4222-8222-222222222222'::uuid
on conflict(id) do nothing;
