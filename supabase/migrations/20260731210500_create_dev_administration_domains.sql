-- Extend the existing coupon domain instead of redefining its established contract.
alter table public.discount_coupons
  add column if not exists is_demo boolean not null default false;

create table if not exists public.platform_integrations (
  key text primary key,
  display_name text not null unique,
  category text not null,
  status text not null default 'disconnected' check (status in ('connected','disconnected','degraded')),
  is_demo boolean not null default false,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

create table if not exists public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text not null,
  status text not null default 'draft' check (status in ('draft','scheduled','active','paused','completed')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketing_leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  source text not null,
  campaign_id uuid references public.marketing_campaigns(id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.cms_documents (
  id uuid primary key default gen_random_uuid(),
  document_type text not null,
  title text not null,
  slug text not null unique,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  body jsonb not null default '{}'::jsonb,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_name_snapshot text not null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.discount_coupons enable row level security;
alter table public.coupon_redemptions enable row level security;
alter table public.platform_integrations enable row level security;
alter table public.marketing_campaigns enable row level security;
alter table public.marketing_leads enable row level security;
alter table public.cms_documents enable row level security;
alter table public.admin_audit_logs enable row level security;

drop policy if exists discount_coupons_demo_select on public.discount_coupons;
create policy discount_coupons_demo_select
on public.discount_coupons for select to anon
using (is_demo);

drop policy if exists coupon_redemptions_demo_select on public.coupon_redemptions;
create policy coupon_redemptions_demo_select
on public.coupon_redemptions for select to anon
using (
  exists (
    select 1
    from public.discount_coupons as coupon
    where coupon.id = coupon_id
      and coupon.is_demo
  )
);

drop policy if exists platform_integrations_demo_select on public.platform_integrations;
create policy platform_integrations_demo_select on public.platform_integrations for select to anon using (is_demo);

drop policy if exists marketing_campaigns_demo_select on public.marketing_campaigns;
create policy marketing_campaigns_demo_select on public.marketing_campaigns for select to anon using (is_demo);

drop policy if exists marketing_leads_demo_select on public.marketing_leads;
create policy marketing_leads_demo_select on public.marketing_leads for select to anon using (is_demo);

drop policy if exists cms_documents_demo_select on public.cms_documents;
create policy cms_documents_demo_select on public.cms_documents for select to anon using (is_demo);

drop policy if exists admin_audit_logs_demo_select on public.admin_audit_logs;
create policy admin_audit_logs_demo_select on public.admin_audit_logs for select to anon using (is_demo);

insert into public.discount_coupons (
  id,
  code,
  discount_type,
  discount_value,
  ends_at,
  usage_limit,
  active,
  is_demo
)
values
  ('dc100000-0000-4000-8000-000000000001','VIVENDO10','percent',1000,now()+interval '60 days',500,true,true),
  ('dc100000-0000-4000-8000-000000000002','PRIMEIRACOMPRA','fixed',2000,now()+interval '90 days',200,true,true)
on conflict (id) do update
set code = excluded.code,
    discount_type = excluded.discount_type,
    discount_value = excluded.discount_value,
    ends_at = excluded.ends_at,
    usage_limit = excluded.usage_limit,
    active = excluded.active,
    is_demo = true,
    updated_at = now();

-- Coupon redemptions are intentionally not seeded. The established domain requires
-- a real order_id and server-calculated discount snapshot.

insert into public.platform_integrations(key,display_name,category,status,is_demo)
values
  ('supabase','Supabase','Banco de dados e autenticação','connected',true),
  ('cloudflare-r2','Cloudflare R2','Armazenamento','disconnected',true),
  ('stripe','Stripe','Pagamentos','disconnected',true),
  ('resend','Resend','E-mail transacional','disconnected',true)
on conflict (key) do update
set display_name = excluded.display_name,
    category = excluded.category,
    status = excluded.status,
    is_demo = true,
    updated_at = now();

insert into public.marketing_campaigns(id,name,channel,status,is_demo)
values
  ('ac100000-0000-4000-8000-000000000001','Lançamento Academia','Instagram','active',true),
  ('ac100000-0000-4000-8000-000000000002','Marketplace para Produtores','E-mail','scheduled',true)
on conflict (id) do update
set name = excluded.name,
    channel = excluded.channel,
    status = excluded.status,
    is_demo = true,
    updated_at = now();

insert into public.marketing_leads(id,name,email,source,campaign_id,is_demo)
values
  ('ad100000-0000-4000-8000-000000000001','Lead de Demonstração','lead.demo@example.test','Formulário institucional','ac100000-0000-4000-8000-000000000001',true)
on conflict (id) do update
set name = excluded.name,
    email = excluded.email,
    source = excluded.source,
    campaign_id = excluded.campaign_id,
    is_demo = true;

insert into public.cms_documents(id,document_type,title,slug,status,body,is_demo)
values
  ('cd100000-0000-4000-8000-000000000001','landing_page','Academia Vivendo da Música','academia','published','{"sections":[]}'::jsonb,true)
on conflict (id) do update
set title = excluded.title,
    status = excluded.status,
    body = excluded.body,
    is_demo = true,
    updated_at = now();

insert into public.admin_audit_logs(id,actor_id,actor_name_snapshot,action,entity_type,entity_id,metadata,is_demo)
values
  ('aa100000-0000-4000-8000-000000000001','44444444-4444-4444-8444-444444444444','Administrador de Desenvolvimento','criou','curso','c9100000-0000-4000-8000-000000000001','{}',true),
  ('aa100000-0000-4000-8000-000000000002','44444444-4444-4444-8444-444444444444','Administrador de Desenvolvimento','revisou','configuração','supabase','{}',true)
on conflict (id) do update
set actor_name_snapshot = excluded.actor_name_snapshot,
    action = excluded.action,
    entity_type = excluded.entity_type,
    entity_id = excluded.entity_id,
    is_demo = true;
