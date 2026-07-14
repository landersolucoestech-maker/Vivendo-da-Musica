create type public.opportunity_kind as enum ('job', 'collab', 'sync', 'grant', 'contest');
create type public.opportunity_status as enum ('draft', 'pending', 'open', 'closed', 'rejected');
create type public.opportunity_application_status as enum ('submitted', 'reviewing', 'shortlisted', 'accepted', 'rejected', 'withdrawn');

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  kind public.opportunity_kind not null,
  title text not null check (char_length(btrim(title)) between 5 and 180),
  organization_name text not null check (char_length(btrim(organization_name)) between 2 and 160),
  location text not null default 'Remoto',
  engagement_type text not null check (char_length(btrim(engagement_type)) between 2 and 60),
  description text not null check (char_length(btrim(description)) between 20 and 10000),
  requirements text[] not null default '{}',
  compensation text,
  external_url text,
  deadline_at timestamptz,
  status public.opportunity_status not null default 'pending',
  application_count integer not null default 0 check (application_count >= 0),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.opportunity_applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  applicant_id uuid not null references auth.users(id) on delete cascade,
  applicant_name_snapshot text not null default 'Candidato',
  cover_letter text not null check (char_length(btrim(cover_letter)) between 20 and 5000),
  portfolio_url text,
  status public.opportunity_application_status not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opportunity_id, applicant_id)
);

create table public.opportunity_favorites (
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (opportunity_id, user_id)
);

create table public.user_portfolios (
  user_id uuid primary key references auth.users(id) on delete cascade,
  headline text not null check (char_length(btrim(headline)) between 3 and 160),
  bio text not null check (char_length(btrim(bio)) between 20 and 3000),
  public_slug text not null unique check (public_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_portfolios(user_id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 180),
  item_type text not null check (item_type in ('audio','video','project','credit','link')),
  url text not null,
  description text,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now()
);

create index opportunities_feed_idx on public.opportunities (status, kind, deadline_at);
create index opportunities_owner_idx on public.opportunities (owner_id, created_at desc);
create index opportunity_applications_applicant_idx on public.opportunity_applications (applicant_id, created_at desc);
create index opportunity_applications_opportunity_idx on public.opportunity_applications (opportunity_id, status, created_at desc);
create index opportunity_favorites_user_idx on public.opportunity_favorites (user_id, created_at desc);
create index portfolio_items_user_idx on public.portfolio_items (user_id, position);

alter table public.opportunities enable row level security;
alter table public.opportunity_applications enable row level security;
alter table public.opportunity_favorites enable row level security;
alter table public.user_portfolios enable row level security;
alter table public.portfolio_items enable row level security;

create policy "Public reads open opportunities" on public.opportunities for select using (status = 'open' or owner_id = (select auth.uid()) or public.is_staff());
create policy "Users submit opportunities" on public.opportunities for insert to authenticated with check (owner_id = (select auth.uid()) and status = 'pending');
create policy "Owners edit unpublished opportunities" on public.opportunities for update to authenticated using (owner_id = (select auth.uid()) and status in ('draft','pending')) with check (owner_id = (select auth.uid()) and status in ('draft','pending'));
create policy "Staff moderates opportunities" on public.opportunities for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "Owners delete unpublished opportunities" on public.opportunities for delete to authenticated using ((owner_id = (select auth.uid()) and status in ('draft','pending')) or public.is_staff());

create policy "Applicants and owners read applications" on public.opportunity_applications for select to authenticated using (applicant_id = (select auth.uid()) or exists (select 1 from public.opportunities o where o.id = opportunity_id and o.owner_id = (select auth.uid())) or public.is_staff());
create policy "Users apply as themselves" on public.opportunity_applications for insert to authenticated with check (applicant_id = (select auth.uid()) and status = 'submitted' and exists (select 1 from public.opportunities o where o.id = opportunity_id and o.status = 'open' and (o.deadline_at is null or o.deadline_at > now())));
create policy "Applicants withdraw applications" on public.opportunity_applications for update to authenticated using (applicant_id = (select auth.uid()) and status in ('submitted','reviewing')) with check (applicant_id = (select auth.uid()) and status = 'withdrawn');
create policy "Owners manage applications" on public.opportunity_applications for update to authenticated using (exists (select 1 from public.opportunities o where o.id = opportunity_id and (o.owner_id = (select auth.uid()) or public.is_staff()))) with check (exists (select 1 from public.opportunities o where o.id = opportunity_id and (o.owner_id = (select auth.uid()) or public.is_staff())));

create policy "Users read own favorites" on public.opportunity_favorites for select to authenticated using (user_id = (select auth.uid()));
create policy "Users add own favorites" on public.opportunity_favorites for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Users remove own favorites" on public.opportunity_favorites for delete to authenticated using (user_id = (select auth.uid()));

create policy "Public reads public portfolios" on public.user_portfolios for select using (is_public or user_id = (select auth.uid()) or public.is_staff());
create policy "Users create own portfolio" on public.user_portfolios for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Users update own portfolio" on public.user_portfolios for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Users delete own portfolio" on public.user_portfolios for delete to authenticated using (user_id = (select auth.uid()));
create policy "Public reads public portfolio items" on public.portfolio_items for select using (exists (select 1 from public.user_portfolios p where p.user_id = portfolio_items.user_id and p.is_public) or user_id = (select auth.uid()) or public.is_staff());
create policy "Users manage own portfolio items" on public.portfolio_items for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create trigger update_opportunities_updated_at before update on public.opportunities for each row execute function public.update_updated_at_column();
create trigger update_opportunity_applications_updated_at before update on public.opportunity_applications for each row execute function public.update_updated_at_column();
create trigger update_user_portfolios_updated_at before update on public.user_portfolios for each row execute function public.update_updated_at_column();

create or replace function public.prepare_opportunity_application()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select coalesce(nullif(btrim(full_name), ''), 'Candidato') into new.applicant_name_snapshot from public.user_profiles where user_id = new.applicant_id;
  new.applicant_name_snapshot := coalesce(new.applicant_name_snapshot, 'Candidato'); return new;
end;
$$;
revoke all on function public.prepare_opportunity_application() from public, anon, authenticated;
create trigger prepare_opportunity_application before insert on public.opportunity_applications for each row execute function public.prepare_opportunity_application();

create or replace function public.sync_opportunity_application_count()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 update public.opportunities set application_count = (select count(*) from public.opportunity_applications where opportunity_id = coalesce(new.opportunity_id, old.opportunity_id) and status <> 'withdrawn') where id = coalesce(new.opportunity_id, old.opportunity_id); return coalesce(new, old);
end;
$$;
revoke all on function public.sync_opportunity_application_count() from public, anon, authenticated;
create trigger sync_opportunity_application_count after insert or update of status or delete on public.opportunity_applications for each row execute function public.sync_opportunity_application_count();

revoke all on table public.opportunities, public.opportunity_applications, public.opportunity_favorites, public.user_portfolios, public.portfolio_items from anon, authenticated;
grant select on table public.opportunities, public.user_portfolios, public.portfolio_items to anon;
grant select, insert, update, delete on table public.opportunities, public.opportunity_applications, public.opportunity_favorites, public.user_portfolios, public.portfolio_items to authenticated;

insert into public.opportunities (slug, kind, title, organization_name, location, engagement_type, description, compensation, deadline_at, status, published_at) values
('produtor-musical-freelancer', 'job', 'Produtor musical freelancer', 'Estudio Aurora', 'Remoto', 'Freelance', 'Procuramos produtor musical para desenvolver arranjos e finalizar faixas de artistas independentes.', 'R$ 2.500 por projeto', '2026-09-30 23:59:59-03', 'open', now()),
('collab-vocalista-pop', 'collab', 'Collab com vocalista pop', 'Coletivo VDM', 'Remoto', 'Projeto', 'Colaboracao para lancamento de single pop com distribuicao digital e divisao transparente de royalties.', 'Split de royalties', '2026-08-31 23:59:59-03', 'open', now()),
('sync-serie-brasileira', 'sync', 'Faixas para serie brasileira', 'Music Supervisor Brasil', 'Remoto', 'Sync', 'Selecao de faixas instrumentais originais para sincronizacao em nova serie brasileira.', 'Licenciamento negociavel', '2026-08-15 23:59:59-03', 'open', now()),
('edital-musica-independente', 'grant', 'Edital de musica independente', 'Instituto Cultural VDM', 'Brasil', 'Edital', 'Apoio financeiro para projetos autorais de artistas e produtores independentes em fase de desenvolvimento.', 'Ate R$ 30.000', '2026-10-15 23:59:59-03', 'open', now()),
('concurso-novos-beatmakers', 'contest', 'Concurso novos beatmakers', 'Vivendo da Musica', 'Online', 'Concurso', 'Concurso nacional para revelar novos beatmakers, com avaliacao tecnica e premiacao para os destaques.', 'Premios e mentoria', '2026-09-15 23:59:59-03', 'open', now());
