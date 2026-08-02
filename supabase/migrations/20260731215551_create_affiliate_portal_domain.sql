-- Affiliate portal domain mirrored from the Supabase development branch.
-- This migration was present remotely but missing from the repository history,
-- which made a clean local rebuild fail as soon as later affiliate seeds/RPCs ran.

do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'user_role'
  ) then
    execute 'alter type public.user_role add value if not exists ''affiliate''';
  end if;
end
$$;

create table if not exists public.affiliate_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 160),
  referral_code text not null unique check (referral_code ~ '^[A-Z0-9_-]{3,32}$'),
  status text not null default 'active' check (status in ('pending','active','suspended','closed')),
  commission_rate numeric(5,2) not null default 10 check (commission_rate between 0 and 100),
  balance_cents bigint not null default 0 check (balance_cents >= 0),
  lifetime_earnings_cents bigint not null default 0 check (lifetime_earnings_cents >= 0),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.affiliate_links (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliate_profiles(id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 2 and 160),
  destination_url text not null check (char_length(destination_url) between 1 and 2048),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
  clicks_count bigint not null default 0 check (clicks_count >= 0),
  conversions_count bigint not null default 0 check (conversions_count >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.affiliate_conversions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliate_profiles(id) on delete cascade,
  affiliate_link_id uuid references public.affiliate_links(id) on delete set null,
  order_id uuid,
  customer_reference text,
  gross_amount_cents bigint not null check (gross_amount_cents >= 0),
  commission_amount_cents bigint not null check (commission_amount_cents >= 0),
  status text not null default 'pending' check (status in ('pending','approved','rejected','refunded')),
  converted_at timestamptz not null default now(),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliate_profiles(id) on delete cascade,
  conversion_id uuid unique references public.affiliate_conversions(id) on delete set null,
  amount_cents bigint not null check (amount_cents >= 0),
  status text not null default 'pending' check (status in ('pending','available','reserved','paid','canceled')),
  available_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.affiliate_marketing_materials (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 2 and 180),
  description text,
  material_type text not null check (material_type in ('banner','image','video','copy','document','other')),
  asset_url text,
  active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.affiliate_withdrawals (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliate_profiles(id) on delete cascade,
  amount_cents bigint not null check (amount_cents > 0),
  status text not null default 'requested' check (status in ('requested','reviewing','approved','paid','rejected','canceled')),
  payment_method text not null default 'pix' check (payment_method in ('pix','bank_transfer')),
  payment_reference text,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists affiliate_links_affiliate_id_idx
  on public.affiliate_links(affiliate_id);
create index if not exists affiliate_conversions_affiliate_id_idx
  on public.affiliate_conversions(affiliate_id);
create index if not exists affiliate_conversions_affiliate_link_id_idx
  on public.affiliate_conversions(affiliate_link_id);
create index if not exists affiliate_conversions_status_idx
  on public.affiliate_conversions(status);
create index if not exists affiliate_commissions_affiliate_id_idx
  on public.affiliate_commissions(affiliate_id);
create index if not exists affiliate_commissions_status_idx
  on public.affiliate_commissions(status);
create index if not exists affiliate_withdrawals_affiliate_id_idx
  on public.affiliate_withdrawals(affiliate_id);

alter table public.affiliate_profiles enable row level security;
alter table public.affiliate_links enable row level security;
alter table public.affiliate_conversions enable row level security;
alter table public.affiliate_commissions enable row level security;
alter table public.affiliate_marketing_materials enable row level security;
alter table public.affiliate_withdrawals enable row level security;

create policy affiliate_profiles_demo_select
on public.affiliate_profiles for select to anon
using (is_demo = true);

create policy affiliate_profiles_owner_select
on public.affiliate_profiles for select to authenticated
using (user_id = (select auth.uid()) or public.is_platform_staff());

create policy affiliate_profiles_staff_insert
on public.affiliate_profiles for insert to authenticated
with check (public.is_platform_staff());

create policy affiliate_profiles_staff_update
on public.affiliate_profiles for update to authenticated
using (public.is_platform_staff())
with check (public.is_platform_staff());

create policy affiliate_profiles_staff_delete
on public.affiliate_profiles for delete to authenticated
using (public.is_platform_staff());

create policy affiliate_links_demo_select
on public.affiliate_links for select to anon
using (exists (
  select 1 from public.affiliate_profiles p
  where p.id = affiliate_links.affiliate_id and p.is_demo = true
));

create policy affiliate_links_owner_select
on public.affiliate_links for select to authenticated
using (exists (
  select 1 from public.affiliate_profiles p
  where p.id = affiliate_links.affiliate_id
    and (p.user_id = (select auth.uid()) or public.is_platform_staff())
));

create policy affiliate_links_owner_insert
on public.affiliate_links for insert to authenticated
with check (exists (
  select 1 from public.affiliate_profiles p
  where p.id = affiliate_links.affiliate_id
    and (p.user_id = (select auth.uid()) or public.is_platform_staff())
));

create policy affiliate_links_owner_update
on public.affiliate_links for update to authenticated
using (exists (
  select 1 from public.affiliate_profiles p
  where p.id = affiliate_links.affiliate_id
    and (p.user_id = (select auth.uid()) or public.is_platform_staff())
))
with check (exists (
  select 1 from public.affiliate_profiles p
  where p.id = affiliate_links.affiliate_id
    and (p.user_id = (select auth.uid()) or public.is_platform_staff())
));

create policy affiliate_links_owner_delete
on public.affiliate_links for delete to authenticated
using (exists (
  select 1 from public.affiliate_profiles p
  where p.id = affiliate_links.affiliate_id
    and (p.user_id = (select auth.uid()) or public.is_platform_staff())
));

create policy affiliate_conversions_demo_select
on public.affiliate_conversions for select to anon
using (exists (
  select 1 from public.affiliate_profiles p
  where p.id = affiliate_conversions.affiliate_id and p.is_demo = true
));

create policy affiliate_conversions_owner_select
on public.affiliate_conversions for select to authenticated
using (exists (
  select 1 from public.affiliate_profiles p
  where p.id = affiliate_conversions.affiliate_id
    and (p.user_id = (select auth.uid()) or public.is_platform_staff())
));

create policy affiliate_conversions_staff_insert
on public.affiliate_conversions for insert to authenticated
with check (public.is_platform_staff());
create policy affiliate_conversions_staff_update
on public.affiliate_conversions for update to authenticated
using (public.is_platform_staff()) with check (public.is_platform_staff());
create policy affiliate_conversions_staff_delete
on public.affiliate_conversions for delete to authenticated
using (public.is_platform_staff());

create policy affiliate_commissions_demo_select
on public.affiliate_commissions for select to anon
using (exists (
  select 1 from public.affiliate_profiles p
  where p.id = affiliate_commissions.affiliate_id and p.is_demo = true
));

create policy affiliate_commissions_owner_select
on public.affiliate_commissions for select to authenticated
using (exists (
  select 1 from public.affiliate_profiles p
  where p.id = affiliate_commissions.affiliate_id
    and (p.user_id = (select auth.uid()) or public.is_platform_staff())
));

create policy affiliate_commissions_staff_insert
on public.affiliate_commissions for insert to authenticated
with check (public.is_platform_staff());
create policy affiliate_commissions_staff_update
on public.affiliate_commissions for update to authenticated
using (public.is_platform_staff()) with check (public.is_platform_staff());
create policy affiliate_commissions_staff_delete
on public.affiliate_commissions for delete to authenticated
using (public.is_platform_staff());

create policy affiliate_materials_public_select
on public.affiliate_marketing_materials for select to anon, authenticated
using (active = true);

create policy affiliate_materials_staff_insert
on public.affiliate_marketing_materials for insert to authenticated
with check (public.is_platform_staff());
create policy affiliate_materials_staff_update
on public.affiliate_marketing_materials for update to authenticated
using (public.is_platform_staff()) with check (public.is_platform_staff());
create policy affiliate_materials_staff_delete
on public.affiliate_marketing_materials for delete to authenticated
using (public.is_platform_staff());

create policy affiliate_withdrawals_demo_select
on public.affiliate_withdrawals for select to anon
using (exists (
  select 1 from public.affiliate_profiles p
  where p.id = affiliate_withdrawals.affiliate_id and p.is_demo = true
));

create policy affiliate_withdrawals_owner_select
on public.affiliate_withdrawals for select to authenticated
using (exists (
  select 1 from public.affiliate_profiles p
  where p.id = affiliate_withdrawals.affiliate_id
    and (p.user_id = (select auth.uid()) or public.is_platform_staff())
));

create policy affiliate_withdrawals_owner_insert
on public.affiliate_withdrawals for insert to authenticated
with check (exists (
  select 1 from public.affiliate_profiles p
  where p.id = affiliate_withdrawals.affiliate_id
    and p.user_id = (select auth.uid())
));

create policy affiliate_withdrawals_staff_update
on public.affiliate_withdrawals for update to authenticated
using (public.is_platform_staff()) with check (public.is_platform_staff());

grant select on public.affiliate_profiles,
  public.affiliate_links,
  public.affiliate_conversions,
  public.affiliate_commissions,
  public.affiliate_marketing_materials,
  public.affiliate_withdrawals
  to anon, authenticated;

grant insert, update, delete on public.affiliate_links to authenticated;
grant insert on public.affiliate_withdrawals to authenticated;
grant insert, update, delete on public.affiliate_profiles,
  public.affiliate_conversions,
  public.affiliate_commissions,
  public.affiliate_marketing_materials
  to authenticated;
grant update on public.affiliate_withdrawals to authenticated;

insert into public.affiliate_profiles (
  id,
  user_id,
  display_name,
  referral_code,
  status,
  commission_rate,
  balance_cents,
  lifetime_earnings_cents,
  is_demo
)
values (
  'af100000-0000-4000-8000-000000000001'::uuid,
  null,
  'Afiliado de Demonstração',
  'VDMDEMO',
  'active',
  12.50,
  73650,
  184900,
  true
)
on conflict (id) do nothing;

insert into public.affiliate_links (
  id, affiliate_id, label, destination_url, slug,
  clicks_count, conversions_count, active
)
values
  (
    'af200000-0000-4000-8000-000000000001'::uuid,
    'af100000-0000-4000-8000-000000000001'::uuid,
    'Curso Produção Musical',
    '/academia/producao-musical-do-zero-ao-profissional',
    'producao-musical-vdmdemo',
    328,
    19,
    true
  ),
  (
    'af200000-0000-4000-8000-000000000002'::uuid,
    'af100000-0000-4000-8000-000000000001'::uuid,
    'Marketplace',
    '/marketplace',
    'marketplace-vdmdemo',
    147,
    8,
    true
  )
on conflict (id) do nothing;

insert into public.affiliate_conversions (
  id, affiliate_id, affiliate_link_id, customer_reference,
  gross_amount_cents, commission_amount_cents, status,
  converted_at, approved_at
)
values
  (
    'af300000-0000-4000-8000-000000000001'::uuid,
    'af100000-0000-4000-8000-000000000001'::uuid,
    'af200000-0000-4000-8000-000000000001'::uuid,
    'Pedido demonstrativo 001',
    39900,
    4988,
    'approved',
    now() - interval '6 days',
    now() - interval '5 days'
  ),
  (
    'af300000-0000-4000-8000-000000000002'::uuid,
    'af100000-0000-4000-8000-000000000001'::uuid,
    'af200000-0000-4000-8000-000000000002'::uuid,
    'Pedido demonstrativo 002',
    12900,
    1613,
    'pending',
    now() - interval '2 days',
    null
  )
on conflict (id) do nothing;

insert into public.affiliate_commissions (
  id, affiliate_id, conversion_id, amount_cents, status,
  available_at, created_at
)
values
  (
    'af400000-0000-4000-8000-000000000001'::uuid,
    'af100000-0000-4000-8000-000000000001'::uuid,
    'af300000-0000-4000-8000-000000000001'::uuid,
    4988,
    'available',
    now() - interval '4 days',
    now() - interval '6 days'
  ),
  (
    'af400000-0000-4000-8000-000000000002'::uuid,
    'af100000-0000-4000-8000-000000000001'::uuid,
    'af300000-0000-4000-8000-000000000002'::uuid,
    1613,
    'pending',
    null,
    now() - interval '2 days'
  )
on conflict (id) do nothing;

insert into public.affiliate_marketing_materials (
  id, title, description, material_type, asset_url, active, is_demo
)
values
  (
    'af500000-0000-4000-8000-000000000001'::uuid,
    'Banner Academia VDM',
    'Banner para divulgação dos cursos da Academia.',
    'banner',
    null,
    true,
    true
  ),
  (
    'af500000-0000-4000-8000-000000000002'::uuid,
    'Texto para redes sociais',
    'Modelo de texto institucional para divulgação.',
    'copy',
    null,
    true,
    true
  )
on conflict (id) do nothing;
