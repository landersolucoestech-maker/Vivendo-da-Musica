-- Company opportunities portal: onboarding, postings, candidate pipeline and messaging.

alter table public.user_profiles drop constraint if exists user_profiles_role_check;
alter table public.user_profiles
  add constraint user_profiles_role_check
  check (role in ('student','instructor','producer','affiliate','company','admin','super_admin'));

create table if not exists public.company_profiles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  owner_user_id uuid not null unique references public.user_profiles(user_id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 180),
  legal_name text,
  description text,
  website_url text,
  logo_url text,
  industry text,
  city text,
  state text,
  country text not null default 'Brasil',
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.company_profiles(id) on delete cascade,
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  member_role text not null default 'recruiter' check (member_role in ('owner','recruiter','reviewer')),
  status text not null default 'active' check (status in ('invited','active','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id,user_id)
);

create table if not exists public.candidate_profiles (
  user_id uuid primary key references public.user_profiles(user_id) on delete cascade,
  headline text,
  bio text,
  city text,
  state text,
  experience_years integer not null default 0 check (experience_years between 0 and 80),
  skills text[] not null default '{}',
  preferred_roles text[] not null default '{}',
  portfolio_url text,
  resume_url text,
  availability text not null default 'open' check (availability in ('open','employed','freelance','unavailable')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.opportunities
  add column if not exists company_id uuid references public.company_profiles(id) on delete set null,
  add column if not exists created_by uuid references public.user_profiles(user_id) on delete set null,
  add column if not exists requirements text[] not null default '{}',
  add column if not exists benefits text[] not null default '{}',
  add column if not exists salary_min_cents integer,
  add column if not exists salary_max_cents integer,
  add column if not exists currency text not null default 'BRL',
  add column if not exists work_mode text not null default 'onsite',
  add column if not exists application_deadline date;

alter table public.opportunities drop constraint if exists opportunities_salary_range_check;
alter table public.opportunities
  add constraint opportunities_salary_range_check
  check (
    (salary_min_cents is null or salary_min_cents >= 0)
    and (salary_max_cents is null or salary_max_cents >= 0)
    and (salary_min_cents is null or salary_max_cents is null or salary_max_cents >= salary_min_cents)
  );

alter table public.opportunities drop constraint if exists opportunities_work_mode_check;
alter table public.opportunities
  add constraint opportunities_work_mode_check
  check (work_mode in ('onsite','hybrid','remote'));

alter table public.opportunity_applications
  add column if not exists recruiter_notes text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists decided_at timestamptz;

alter table public.opportunity_applications drop constraint if exists opportunity_applications_status_check;
alter table public.opportunity_applications
  add constraint opportunity_applications_status_check
  check (status in ('submitted','reviewing','shortlisted','interview','approved','rejected','withdrawn'));

create table if not exists public.opportunity_application_messages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.opportunity_applications(id) on delete cascade,
  sender_id uuid not null references public.user_profiles(user_id) on delete cascade,
  sender_type text not null check (sender_type in ('candidate','company')),
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists company_members_user_id_idx on public.company_members(user_id);
create index if not exists company_members_company_status_idx on public.company_members(company_id,status);
create index if not exists opportunities_company_id_idx on public.opportunities(company_id);
create index if not exists opportunities_created_by_idx on public.opportunities(created_by);
create index if not exists opportunities_company_status_idx on public.opportunities(company_id,status,published_at desc);
create index if not exists opportunity_applications_status_idx on public.opportunity_applications(status,created_at desc);
create index if not exists opportunity_messages_application_created_idx on public.opportunity_application_messages(application_id,created_at);
create index if not exists opportunity_messages_sender_id_idx on public.opportunity_application_messages(sender_id);

alter table public.company_profiles enable row level security;
alter table public.company_members enable row level security;
alter table public.candidate_profiles enable row level security;
alter table public.opportunity_application_messages enable row level security;

create or replace function public.is_company_member(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_staff()
    or exists (
      select 1
      from public.company_members member
      where member.company_id = target_company_id
        and member.user_id = (select auth.uid())
        and member.status = 'active'
    );
$$;

create or replace function public.is_company_owner(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_staff()
    or exists (
      select 1
      from public.company_members member
      where member.company_id = target_company_id
        and member.user_id = (select auth.uid())
        and member.member_role = 'owner'
        and member.status = 'active'
    );
$$;

revoke all on function public.is_company_member(uuid) from public, anon;
revoke all on function public.is_company_owner(uuid) from public, anon;
grant execute on function public.is_company_member(uuid) to authenticated;
grant execute on function public.is_company_owner(uuid) to authenticated;

create or replace function public.sync_opportunity_application_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_opportunity_id uuid;
begin
  target_opportunity_id := coalesce(new.opportunity_id, old.opportunity_id);
  update public.opportunities opportunity
  set application_count = (
    select count(*)::integer
    from public.opportunity_applications application
    where application.opportunity_id = target_opportunity_id
      and application.status <> 'withdrawn'
  ), updated_at = now()
  where opportunity.id = target_opportunity_id;
  return coalesce(new, old);
end;
$$;

revoke all on function public.sync_opportunity_application_count() from public, anon, authenticated;

drop trigger if exists opportunity_applications_sync_count on public.opportunity_applications;
create trigger opportunity_applications_sync_count
after insert or delete or update of opportunity_id,status on public.opportunity_applications
for each row execute function public.sync_opportunity_application_count();

drop trigger if exists company_profiles_set_updated_at on public.company_profiles;
create trigger company_profiles_set_updated_at before update on public.company_profiles
for each row execute function public.set_updated_at();

drop trigger if exists company_members_set_updated_at on public.company_members;
create trigger company_members_set_updated_at before update on public.company_members
for each row execute function public.set_updated_at();

drop trigger if exists candidate_profiles_set_updated_at on public.candidate_profiles;
create trigger candidate_profiles_set_updated_at before update on public.candidate_profiles
for each row execute function public.set_updated_at();

drop trigger if exists opportunities_set_updated_at on public.opportunities;
create trigger opportunities_set_updated_at before update on public.opportunities
for each row execute function public.set_updated_at();

drop trigger if exists opportunity_applications_set_updated_at on public.opportunity_applications;
create trigger opportunity_applications_set_updated_at before update on public.opportunity_applications
for each row execute function public.set_updated_at();

-- Company signup is selected explicitly through auth metadata.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_name text;
  normalized_company_name text;
  requested_role text;
  created_company_id uuid;
begin
  normalized_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  normalized_company_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'company_name', '')), '');
  requested_role := case
    when new.raw_user_meta_data ->> 'account_type' = 'company' then 'company'
    else 'student'
  end;

  insert into public.user_profiles (user_id,full_name,role,is_demo)
  values (
    new.id,
    left(coalesce(normalized_name, split_part(coalesce(new.email,'Usuário'),'@',1)),160),
    requested_role,
    false
  )
  on conflict (user_id) do nothing;

  if requested_role = 'company' then
    insert into public.company_profiles (
      slug,owner_user_id,display_name,legal_name,verification_status,is_demo
    ) values (
      'empresa-' || left(replace(new.id::text,'-',''),12),
      new.id,
      left(coalesce(normalized_company_name, normalized_name, 'Empresa'),180),
      left(coalesce(normalized_company_name, normalized_name, 'Empresa'),180),
      'pending',
      false
    )
    on conflict (owner_user_id) do update
      set display_name = excluded.display_name,
          updated_at = now()
    returning id into created_company_id;

    insert into public.company_members (company_id,user_id,member_role,status)
    values (created_company_id,new.id,'owner','active')
    on conflict (company_id,user_id) do update
      set member_role='owner',status='active',updated_at=now();
  end if;

  return new;
end;
$$;

-- Replace the original broad opportunity policies with ownership-aware policies.
drop policy if exists opportunities_public_read on public.opportunities;
drop policy if exists opportunities_anon_read on public.opportunities;
drop policy if exists opportunities_anon_insert on public.opportunities;
drop policy if exists opportunities_anon_update on public.opportunities;
drop policy if exists opportunities_anon_delete on public.opportunities;
drop policy if exists opportunities_authenticated_read on public.opportunities;
drop policy if exists opportunities_company_insert on public.opportunities;
drop policy if exists opportunities_company_update on public.opportunities;
drop policy if exists opportunities_company_delete on public.opportunities;

create policy opportunities_anon_read on public.opportunities for select to anon
using (status='open' or is_demo);
create policy opportunities_authenticated_read on public.opportunities for select to authenticated
using (status='open' or public.is_company_member(company_id));
create policy opportunities_company_insert on public.opportunities for insert to authenticated
with check (created_by=(select auth.uid()) and public.is_company_member(company_id));
create policy opportunities_company_update on public.opportunities for update to authenticated
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));
create policy opportunities_company_delete on public.opportunities for delete to authenticated
using (public.is_company_member(company_id));

-- Candidate and company access to applications.
drop policy if exists opportunity_applications_demo_all on public.opportunity_applications;
drop policy if exists opportunity_applications_anon_read on public.opportunity_applications;
drop policy if exists opportunity_applications_anon_insert on public.opportunity_applications;
drop policy if exists opportunity_applications_anon_update on public.opportunity_applications;
drop policy if exists opportunity_applications_authenticated_read on public.opportunity_applications;
drop policy if exists opportunity_applications_candidate_insert on public.opportunity_applications;
drop policy if exists opportunity_applications_company_update on public.opportunity_applications;

create policy opportunity_applications_authenticated_read on public.opportunity_applications for select to authenticated
using (
  applicant_id=(select auth.uid())
  or public.is_company_member((select opportunity.company_id from public.opportunities opportunity where opportunity.id=opportunity_id))
);
create policy opportunity_applications_candidate_insert on public.opportunity_applications for insert to authenticated
with check (
  applicant_id=(select auth.uid())
  and exists (select 1 from public.opportunities opportunity where opportunity.id=opportunity_id and opportunity.status='open')
);
create policy opportunity_applications_company_update on public.opportunity_applications for update to authenticated
using (public.is_company_member((select opportunity.company_id from public.opportunities opportunity where opportunity.id=opportunity_id)))
with check (public.is_company_member((select opportunity.company_id from public.opportunities opportunity where opportunity.id=opportunity_id)));

-- Company profile and membership policies.
create policy company_profiles_anon_read on public.company_profiles for select to anon
using (verification_status='verified' or is_demo);
create policy company_profiles_authenticated_read on public.company_profiles for select to authenticated
using (verification_status='verified' or owner_user_id=(select auth.uid()) or public.is_company_member(id));
create policy company_profiles_owner_insert on public.company_profiles for insert to authenticated
with check (owner_user_id=(select auth.uid()) or public.is_platform_staff());
create policy company_profiles_owner_update on public.company_profiles for update to authenticated
using (public.is_company_member(id)) with check (public.is_company_member(id));
create policy company_profiles_owner_delete on public.company_profiles for delete to authenticated
using (public.is_company_owner(id));

create policy company_members_own_read on public.company_members for select to authenticated
using (user_id=(select auth.uid()) or public.is_platform_staff());
create policy company_members_owner_insert on public.company_members for insert to authenticated
with check (public.is_company_owner(company_id));
create policy company_members_owner_update on public.company_members for update to authenticated
using (public.is_company_owner(company_id)) with check (public.is_company_owner(company_id));
create policy company_members_owner_delete on public.company_members for delete to authenticated
using (public.is_company_owner(company_id));

create policy candidate_profiles_authenticated_read on public.candidate_profiles for select to authenticated
using (
  user_id=(select auth.uid())
  or public.is_platform_staff()
  or exists (
    select 1
    from public.opportunity_applications application
    join public.opportunities opportunity on opportunity.id=application.opportunity_id
    where application.applicant_id=candidate_profiles.user_id
      and public.is_company_member(opportunity.company_id)
  )
);
create policy candidate_profiles_owner_insert on public.candidate_profiles for insert to authenticated
with check (user_id=(select auth.uid()) or public.is_platform_staff());
create policy candidate_profiles_owner_update on public.candidate_profiles for update to authenticated
using (user_id=(select auth.uid()) or public.is_platform_staff())
with check (user_id=(select auth.uid()) or public.is_platform_staff());

create policy opportunity_messages_authenticated_read on public.opportunity_application_messages for select to authenticated
using (
  exists (
    select 1
    from public.opportunity_applications application
    join public.opportunities opportunity on opportunity.id=application.opportunity_id
    where application.id=application_id
      and (application.applicant_id=(select auth.uid()) or public.is_company_member(opportunity.company_id))
  )
);
create policy opportunity_messages_authenticated_insert on public.opportunity_application_messages for insert to authenticated
with check (
  sender_id=(select auth.uid())
  and exists (
    select 1
    from public.opportunity_applications application
    join public.opportunities opportunity on opportunity.id=application.opportunity_id
    where application.id=application_id
      and (application.applicant_id=(select auth.uid()) or public.is_company_member(opportunity.company_id))
  )
);
create policy opportunity_messages_authenticated_update on public.opportunity_application_messages for update to authenticated
using (
  exists (
    select 1
    from public.opportunity_applications application
    join public.opportunities opportunity on opportunity.id=application.opportunity_id
    where application.id=application_id
      and (application.applicant_id=(select auth.uid()) or public.is_company_member(opportunity.company_id))
  )
)
with check (
  exists (
    select 1
    from public.opportunity_applications application
    join public.opportunities opportunity on opportunity.id=application.opportunity_id
    where application.id=application_id
      and (application.applicant_id=(select auth.uid()) or public.is_company_member(opportunity.company_id))
  )
);

-- Demo identities and tightly scoped anonymous preview access.
insert into public.user_profiles (user_id,full_name,role,is_demo) values
('55555555-5555-4555-8555-555555555555','Equipe Estúdio Órbita','company',true),
('66666666-6666-4666-8666-666666666666','Marina Alves','student',true),
('77777777-7777-4777-8777-777777777777','Rafael Nunes','student',true),
('88888888-8888-4888-8888-888888888888','Bianca Souza','student',true)
on conflict (user_id) do update set full_name=excluded.full_name,role=excluded.role,is_demo=true,updated_at=now();

insert into public.company_profiles (
  slug,owner_user_id,display_name,legal_name,description,website_url,industry,city,state,country,verification_status,is_demo
) values (
  'estudio-orbita-demo','55555555-5555-4555-8555-555555555555','Estúdio Órbita','Estúdio Órbita Produções Ltda.',
  'Empresa demonstrativa focada em produção musical, conteúdo audiovisual, campanhas e desenvolvimento de artistas.',
  'https://example.com/estudio-orbita','Música e entretenimento','Belo Horizonte','MG','Brasil','verified',true
)
on conflict (slug) do update set
  owner_user_id=excluded.owner_user_id,display_name=excluded.display_name,legal_name=excluded.legal_name,
  description=excluded.description,website_url=excluded.website_url,industry=excluded.industry,
  city=excluded.city,state=excluded.state,verification_status='verified',is_demo=true,updated_at=now();

insert into public.company_members (company_id,user_id,member_role,status)
select company.id,'55555555-5555-4555-8555-555555555555','owner','active'
from public.company_profiles company where company.slug='estudio-orbita-demo'
on conflict (company_id,user_id) do update set member_role='owner',status='active',updated_at=now();

insert into public.candidate_profiles (
  user_id,headline,bio,city,state,experience_years,skills,preferred_roles,portfolio_url,availability,is_demo
) values
('11111111-1111-4111-8111-111111111111','Produtor musical e beatmaker','Produtor em desenvolvimento com foco em trap, funk e afrobeat. Organiza projetos, cria arranjos e trabalha com artistas independentes.','Belo Horizonte','MG',2,array['FL Studio','Beatmaking','Arranjo','Mixagem básica'],array['Produtor musical','Beatmaker'],'https://example.com/portfolio/aluno-demo','freelance',true),
('66666666-6666-4666-8666-666666666666','Social media para artistas','Profissional de conteúdo com experiência em planejamento editorial, captação mobile e análise de desempenho.','São Paulo','SP',4,array['Planejamento de conteúdo','Instagram','TikTok','Copywriting','Métricas'],array['Social media','Analista de conteúdo'],'https://example.com/portfolio/marina','open',true),
('77777777-7777-4777-8777-777777777777','Engenheiro de áudio','Técnico de gravação e mixagem com experiência em sessões vocais, edição e entrega para streaming.','Rio de Janeiro','RJ',5,array['Pro Tools','Gravação vocal','Mixagem','Edição de áudio'],array['Engenheiro de áudio','Técnico de estúdio'],'https://example.com/portfolio/rafael','open',true),
('88888888-8888-4888-8888-888888888888','Videomaker e editora','Criadora audiovisual para clipes, bastidores, conteúdo vertical e campanhas de lançamento.','Contagem','MG',3,array['Premiere','DaVinci Resolve','Captação','Roteiro','Conteúdo vertical'],array['Videomaker','Editora de vídeo'],'https://example.com/portfolio/bianca','freelance',true)
on conflict (user_id) do update set
  headline=excluded.headline,bio=excluded.bio,city=excluded.city,state=excluded.state,
  experience_years=excluded.experience_years,skills=excluded.skills,preferred_roles=excluded.preferred_roles,
  portfolio_url=excluded.portfolio_url,availability=excluded.availability,is_demo=true,updated_at=now();

with company as (select id from public.company_profiles where slug='estudio-orbita-demo'),
new_opportunities(kind,title,location,engagement_type,description,requirements,benefits,salary_min_cents,salary_max_cents,work_mode,deadline_offset) as (
  values
  ('job','Produtor Musical Júnior','Belo Horizonte, MG','CLT','Atuação na produção, edição e organização de sessões para artistas do casting.',array['Domínio de uma DAW','Organização de sessões','Noções de mixagem','Portfólio musical'],array['Plano de desenvolvimento','Acesso ao estúdio','Horário flexível'],280000,380000,'hybrid',25),
  ('job','Social Media para Artistas','Remoto','PJ','Planejamento e execução de conteúdo para campanhas de lançamentos e rotina dos artistas.',array['Experiência com Instagram e TikTok','Boa escrita','Leitura de métricas'],array['Trabalho remoto','Bônus por campanha'],320000,450000,'remote',18),
  ('job','Técnico de Gravação','Belo Horizonte, MG','Freelance','Condução de sessões vocais, preparação de equipamento, edição e organização de arquivos.',array['Experiência em gravação vocal','Conhecimento de Pro Tools ou similar','Disponibilidade noturna'],array['Pagamento por diária','Créditos nos projetos'],25000,45000,'onsite',12),
  ('collab','Videomaker para Clipe Independente','Contagem, MG','Projeto','Parceria remunerada para captação e edição de videoclipe e conteúdos verticais.',array['Portfólio audiovisual','Equipamento próprio','Edição de vídeo'],array['Crédito oficial','Material para portfólio'],180000,260000,'onsite',30),
  ('sync','Compositores para Catálogo de Sync','Remoto','Seleção contínua','Seleção de compositores e produtores para criação de faixas destinadas a publicidade e audiovisual.',array['Obras autorais','Capacidade de entregar stems','Metadados organizados'],array['Participação em licenciamento','Briefings recorrentes'],null,null,'remote',45)
)
insert into public.opportunities (
  company_id,created_by,kind,title,organization_name,location,engagement_type,status,description,
  requirements,benefits,salary_min_cents,salary_max_cents,currency,work_mode,application_deadline,
  published_at,is_demo,created_at,updated_at
)
select company.id,'55555555-5555-4555-8555-555555555555',item.kind,item.title,'Estúdio Órbita',item.location,item.engagement_type,
  'open',item.description,item.requirements,item.benefits,item.salary_min_cents,item.salary_max_cents,'BRL',item.work_mode,
  current_date+item.deadline_offset,now()-interval '5 days',true,now()-interval '7 days',now()
from company cross join new_opportunities item
where not exists (
  select 1 from public.opportunities existing where existing.company_id=company.id and existing.title=item.title
);

with applications(candidate_id,opportunity_title,cover_letter,portfolio_url,status,notes,days_ago) as (
  values
  ('11111111-1111-4111-8111-111111111111'::uuid,'Produtor Musical Júnior','Tenho experiência prática produzindo beats e organizando sessões. Quero evoluir em ambiente profissional e contribuir com o repertório do estúdio.','https://example.com/portfolio/aluno-demo','reviewing','Boa aderência técnica; verificar disponibilidade para rotina híbrida.',4),
  ('77777777-7777-4777-8777-777777777777'::uuid,'Técnico de Gravação','Atuo há cinco anos com gravação e edição vocal. Tenho experiência com preparação de sessão, direção de captação e entrega organizada.','https://example.com/portfolio/rafael','shortlisted','Portfólio consistente. Prioridade para entrevista.',3),
  ('66666666-6666-4666-8666-666666666666'::uuid,'Social Media para Artistas','Trabalho com conteúdo musical e campanhas de lançamento. Posso estruturar calendário, produção diária e relatórios por artista.','https://example.com/portfolio/marina','interview','Entrevista inicial marcada.',2),
  ('88888888-8888-4888-8888-888888888888'::uuid,'Videomaker para Clipe Independente','Tenho experiência em captação de performance, bastidores e edição vertical. Posso assumir roteiro técnico, gravação e versões sociais.','https://example.com/portfolio/bianca','submitted',null,1),
  ('11111111-1111-4111-8111-111111111111'::uuid,'Compositores para Catálogo de Sync','Produzo faixas instrumentais e consigo entregar stems, versões e metadados organizados conforme o briefing.','https://example.com/portfolio/aluno-demo','submitted',null,1)
)
insert into public.opportunity_applications (
  opportunity_id,applicant_id,cover_letter,portfolio_url,status,recruiter_notes,reviewed_at,created_at,updated_at
)
select opportunity.id,item.candidate_id,item.cover_letter,item.portfolio_url,item.status,item.notes,
  case when item.status='submitted' then null else now()-interval '1 day' end,
  now()-(item.days_ago || ' days')::interval,now()
from applications item
join public.opportunities opportunity on opportunity.title=item.opportunity_title
join public.company_profiles company on company.id=opportunity.company_id and company.slug='estudio-orbita-demo'
on conflict (opportunity_id,applicant_id) do update set
  cover_letter=excluded.cover_letter,portfolio_url=excluded.portfolio_url,status=excluded.status,
  recruiter_notes=excluded.recruiter_notes,reviewed_at=excluded.reviewed_at,updated_at=now();

with seeded_messages(opportunity_title,candidate_id,sender_id,sender_type,body,hours_ago) as (
  values
  ('Social Media para Artistas','66666666-6666-4666-8666-666666666666'::uuid,'55555555-5555-4555-8555-555555555555'::uuid,'company','Olá, Marina. Gostamos do seu perfil e queremos conversar sobre a rotina da vaga.',30),
  ('Social Media para Artistas','66666666-6666-4666-8666-666666666666'::uuid,'66666666-6666-4666-8666-666666666666'::uuid,'candidate','Obrigada pelo retorno. Tenho disponibilidade amanhã no período da tarde.',26),
  ('Técnico de Gravação','77777777-7777-4777-8777-777777777777'::uuid,'55555555-5555-4555-8555-555555555555'::uuid,'company','Rafael, seu material foi selecionado para a próxima etapa. Pode enviar dois horários disponíveis?',18),
  ('Técnico de Gravação','77777777-7777-4777-8777-777777777777'::uuid,'77777777-7777-4777-8777-777777777777'::uuid,'candidate','Posso na terça às 14h ou quarta às 10h.',14),
  ('Produtor Musical Júnior','11111111-1111-4111-8111-111111111111'::uuid,'55555555-5555-4555-8555-555555555555'::uuid,'company','Recebemos sua candidatura e estamos analisando os projetos enviados.',8)
)
insert into public.opportunity_application_messages (application_id,sender_id,sender_type,body,created_at)
select application.id,item.sender_id,item.sender_type,item.body,now()-(item.hours_ago || ' hours')::interval
from seeded_messages item
join public.opportunities opportunity on opportunity.title=item.opportunity_title
join public.company_profiles company on company.id=opportunity.company_id and company.slug='estudio-orbita-demo'
join public.opportunity_applications application on application.opportunity_id=opportunity.id and application.applicant_id=item.candidate_id
where not exists (
  select 1 from public.opportunity_application_messages existing
  where existing.application_id=application.id and existing.sender_id=item.sender_id and existing.body=item.body
);

create policy company_profiles_demo_update on public.company_profiles for update to anon
using (is_demo and owner_user_id='55555555-5555-4555-8555-555555555555'::uuid)
with check (is_demo and owner_user_id='55555555-5555-4555-8555-555555555555'::uuid);
create policy company_members_demo_read on public.company_members for select to anon
using (
  user_id='55555555-5555-4555-8555-555555555555'::uuid
  and exists (select 1 from public.company_profiles company where company.id=company_id and company.is_demo)
);
create policy candidate_profiles_demo_read on public.candidate_profiles for select to anon
using (is_demo);
create policy opportunities_anon_insert on public.opportunities for insert to anon
with check (
  is_demo
  and created_by='55555555-5555-4555-8555-555555555555'::uuid
  and exists (select 1 from public.company_profiles company where company.id=company_id and company.slug='estudio-orbita-demo' and company.is_demo)
);
create policy opportunities_anon_update on public.opportunities for update to anon
using (is_demo and exists (select 1 from public.company_profiles company where company.id=company_id and company.slug='estudio-orbita-demo' and company.is_demo))
with check (is_demo and created_by='55555555-5555-4555-8555-555555555555'::uuid and exists (select 1 from public.company_profiles company where company.id=company_id and company.slug='estudio-orbita-demo' and company.is_demo));
create policy opportunities_anon_delete on public.opportunities for delete to anon
using (is_demo and exists (select 1 from public.company_profiles company where company.id=company_id and company.slug='estudio-orbita-demo' and company.is_demo));
create policy opportunity_applications_anon_read on public.opportunity_applications for select to anon
using (
  applicant_id='11111111-1111-4111-8111-111111111111'::uuid
  or exists (
    select 1 from public.opportunities opportunity
    join public.company_profiles company on company.id=opportunity.company_id
    where opportunity.id=opportunity_id and company.slug='estudio-orbita-demo' and company.is_demo
  )
);
create policy opportunity_applications_anon_insert on public.opportunity_applications for insert to anon
with check (
  applicant_id='11111111-1111-4111-8111-111111111111'::uuid
  and exists (select 1 from public.opportunities opportunity where opportunity.id=opportunity_id and opportunity.status='open')
);
create policy opportunity_applications_anon_update on public.opportunity_applications for update to anon
using (
  exists (
    select 1 from public.opportunities opportunity
    join public.company_profiles company on company.id=opportunity.company_id
    join public.candidate_profiles candidate on candidate.user_id=applicant_id
    where opportunity.id=opportunity_id and company.slug='estudio-orbita-demo' and company.is_demo and candidate.is_demo
  )
)
with check (
  exists (
    select 1 from public.opportunities opportunity
    join public.company_profiles company on company.id=opportunity.company_id
    join public.candidate_profiles candidate on candidate.user_id=applicant_id
    where opportunity.id=opportunity_id and company.slug='estudio-orbita-demo' and company.is_demo and candidate.is_demo
  )
);
create policy opportunity_messages_demo_read on public.opportunity_application_messages for select to anon
using (
  exists (
    select 1 from public.opportunity_applications application
    join public.opportunities opportunity on opportunity.id=application.opportunity_id
    join public.company_profiles company on company.id=opportunity.company_id
    where application.id=application_id and company.slug='estudio-orbita-demo' and company.is_demo
  )
);
create policy opportunity_messages_demo_insert on public.opportunity_application_messages for insert to anon
with check (
  sender_id in (
    '11111111-1111-4111-8111-111111111111'::uuid,
    '55555555-5555-4555-8555-555555555555'::uuid,
    '66666666-6666-4666-8666-666666666666'::uuid,
    '77777777-7777-4777-8777-777777777777'::uuid,
    '88888888-8888-4888-8888-888888888888'::uuid
  )
  and exists (
    select 1 from public.opportunity_applications application
    join public.opportunities opportunity on opportunity.id=application.opportunity_id
    join public.company_profiles company on company.id=opportunity.company_id
    where application.id=application_id and company.slug='estudio-orbita-demo' and company.is_demo
  )
);
create policy opportunity_messages_demo_update on public.opportunity_application_messages for update to anon
using (
  exists (
    select 1 from public.opportunity_applications application
    join public.opportunities opportunity on opportunity.id=application.opportunity_id
    join public.company_profiles company on company.id=opportunity.company_id
    where application.id=application_id and company.slug='estudio-orbita-demo' and company.is_demo
  )
)
with check (
  exists (
    select 1 from public.opportunity_applications application
    join public.opportunities opportunity on opportunity.id=application.opportunity_id
    join public.company_profiles company on company.id=opportunity.company_id
    where application.id=application_id and company.slug='estudio-orbita-demo' and company.is_demo
  )
);

grant select,insert,update,delete on public.company_profiles,public.company_members,public.candidate_profiles,
  public.opportunities,public.opportunity_applications,public.opportunity_application_messages to authenticated;
grant select,update on public.company_profiles to anon;
grant select on public.company_members,public.candidate_profiles to anon;
grant select,insert,update,delete on public.opportunities to anon;
grant select,insert,update on public.opportunity_applications,public.opportunity_application_messages to anon;

-- Recalculate counts after the seed.
update public.opportunities opportunity
set application_count=(
  select count(*)::integer from public.opportunity_applications application
  where application.opportunity_id=opportunity.id and application.status<>'withdrawn'
), updated_at=now()
where opportunity.company_id=(select id from public.company_profiles where slug='estudio-orbita-demo');
