create table public.platform_settings (
  key text primary key check (key ~ '^[a-z0-9_.-]+$'),
  value jsonb not null,
  description text,
  is_public boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.feature_flags (
  key text primary key check (key ~ '^[a-z0-9_.-]+$'),
  description text not null,
  enabled boolean not null default false,
  rollout_percentage smallint not null default 100 check (rollout_percentage between 0 and 100),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.platform_integrations (
  key text primary key,
  display_name text not null,
  category text not null,
  status text not null default 'not_configured' check (status in ('connected','disconnected','not_configured','error')),
  config jsonb not null default '{}',
  last_checked_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.admin_audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  actor_name_snapshot text not null default 'Sistema',
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text not null,
  status text not null check (status in ('draft','scheduled','active','paused','completed')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.marketing_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  source text not null,
  status text not null default 'new' check (status in ('new','qualified','converted','unsubscribed')),
  consent_at timestamptz,
  created_at timestamptz not null default now(),
  unique(email, source)
);

create index platform_settings_updated_by_idx on public.platform_settings(updated_by);
create index feature_flags_updated_by_idx on public.feature_flags(updated_by);
create index platform_integrations_updated_by_idx on public.platform_integrations(updated_by);
create index admin_audit_logs_created_idx on public.admin_audit_logs(created_at desc);
create index admin_audit_logs_actor_idx on public.admin_audit_logs(actor_id,created_at desc);
create index marketing_campaigns_creator_idx on public.marketing_campaigns(created_by,created_at desc);
create index marketing_leads_status_idx on public.marketing_leads(status,created_at desc);

alter table public.platform_settings enable row level security;
alter table public.feature_flags enable row level security;
alter table public.platform_integrations enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.marketing_campaigns enable row level security;
alter table public.marketing_leads enable row level security;

create policy "Public reads public settings" on public.platform_settings for select using (is_public or public.is_staff());
create policy "Staff manages settings" on public.platform_settings for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "Public reads feature flags" on public.feature_flags for select using (true);
create policy "Staff manages feature flags" on public.feature_flags for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "Staff manages integrations" on public.platform_integrations for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "Staff reads audit logs" on public.admin_audit_logs for select to authenticated using (public.is_staff());
create policy "Staff writes audit logs" on public.admin_audit_logs for insert to authenticated with check (actor_id=(select auth.uid()) and public.is_staff());
create policy "Staff manages campaigns" on public.marketing_campaigns for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "Staff manages leads" on public.marketing_leads for all to authenticated using (public.is_staff()) with check (public.is_staff());

create trigger update_marketing_campaigns_updated_at before update on public.marketing_campaigns for each row execute function public.update_updated_at_column();

revoke all on table public.platform_settings,public.feature_flags,public.platform_integrations,public.admin_audit_logs,public.marketing_campaigns,public.marketing_leads from anon,authenticated;
grant select on table public.platform_settings,public.feature_flags to anon;
grant select,insert,update,delete on table public.platform_settings,public.feature_flags,public.platform_integrations,public.marketing_campaigns,public.marketing_leads to authenticated;
grant select,insert on table public.admin_audit_logs to authenticated;

insert into public.platform_settings(key,value,description,is_public) values
('platform.name','"Vivendo da Musica"','Nome publico da plataforma',true),
('support.email','"contato@vivendodamusica.com"','Email de suporte',true),
('platform.maintenance','false','Modo de manutencao',true);
insert into public.feature_flags(key,description,enabled,rollout_percentage) values
('community.realtime','Presenca e atualizacoes em tempo real',false,0),
('marketplace.checkout','Checkout do marketplace',true,100),
('events.certificates','Certificados automaticos de eventos',true,100),
('opportunities.portfolios','Portfolio publico nas oportunidades',true,100);
insert into public.platform_integrations(key,display_name,category,status) values
('supabase','Supabase','Infraestrutura','connected'),('stripe','Stripe','Pagamentos','not_configured'),('resend','Resend','Email','not_configured'),('analytics','Analytics','Observabilidade','not_configured');
