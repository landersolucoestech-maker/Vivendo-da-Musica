create type public.cms_document_type as enum ('article', 'landing_page');
create type public.cms_document_status as enum ('draft', 'review', 'scheduled', 'published', 'archived');

create table public.cms_documents (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users(id) on delete set null,
  author_name_snapshot text not null default 'Equipe Vivendo da Musica',
  document_type public.cms_document_type not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(btrim(title)) between 3 and 180),
  excerpt text not null default '' check (char_length(excerpt) <= 500),
  body text not null default '',
  category text,
  tag text,
  level text check (level is null or level in ('Iniciante','Intermediario','Avancado')),
  read_minutes integer not null default 1 check (read_minutes between 1 and 180),
  is_premium boolean not null default false,
  is_featured boolean not null default false,
  seo_title text check (seo_title is null or char_length(seo_title) <= 70),
  seo_description text check (seo_description is null or char_length(seo_description) <= 170),
  canonical_url text,
  og_title text check (og_title is null or char_length(og_title) <= 100),
  og_description text check (og_description is null or char_length(og_description) <= 200),
  og_image_url text,
  related_slugs text[] not null default '{}',
  status public.cms_document_status not null default 'draft',
  scheduled_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cms_blocks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.cms_documents(id) on delete cascade,
  block_type text not null check (block_type in ('hero','rich_text','image','video','cta','columns','faq','products','courses')),
  content jsonb not null default '{}',
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id, position)
);

create table public.cms_revisions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.cms_documents(id) on delete cascade,
  editor_id uuid references auth.users(id) on delete set null,
  revision_number integer not null check (revision_number > 0),
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique (document_id, revision_number)
);

create table public.cms_media (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid references auth.users(id) on delete set null,
  storage_path text not null unique,
  public_url text not null,
  alt_text text not null check (char_length(btrim(alt_text)) between 2 and 300),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  width integer,
  height integer,
  created_at timestamptz not null default now()
);

create index cms_documents_public_idx on public.cms_documents (document_type, status, published_at desc);
create index cms_documents_schedule_idx on public.cms_documents (status, scheduled_at) where status = 'scheduled';
create index cms_documents_author_idx on public.cms_documents (author_id, updated_at desc);
create index cms_blocks_document_idx on public.cms_blocks (document_id, position);
create index cms_revisions_document_idx on public.cms_revisions (document_id, revision_number desc);
create index cms_media_uploader_idx on public.cms_media (uploaded_by, created_at desc);

alter table public.cms_documents enable row level security;
alter table public.cms_blocks enable row level security;
alter table public.cms_revisions enable row level security;
alter table public.cms_media enable row level security;

create policy "Public reads published or due CMS documents" on public.cms_documents for select
using (status = 'published' or (status = 'scheduled' and scheduled_at <= now()) or public.is_staff());
create policy "Staff creates CMS documents" on public.cms_documents for insert to authenticated with check (public.is_staff());
create policy "Staff updates CMS documents" on public.cms_documents for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "Staff deletes CMS documents" on public.cms_documents for delete to authenticated using (public.is_staff());

create policy "Public reads blocks of published documents" on public.cms_blocks for select
using (exists (select 1 from public.cms_documents d where d.id = document_id and (d.status = 'published' or (d.status = 'scheduled' and d.scheduled_at <= now()))) or public.is_staff());
create policy "Staff manages CMS blocks" on public.cms_blocks for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "Staff reads CMS revisions" on public.cms_revisions for select to authenticated using (public.is_staff());
create policy "Staff creates CMS revisions" on public.cms_revisions for insert to authenticated with check (public.is_staff());
create policy "Public reads CMS media metadata" on public.cms_media for select using (true);
create policy "Staff manages CMS media metadata" on public.cms_media for all to authenticated using (public.is_staff()) with check (public.is_staff());

create trigger update_cms_documents_updated_at before update on public.cms_documents for each row execute function public.update_updated_at_column();
create trigger update_cms_blocks_updated_at before update on public.cms_blocks for each row execute function public.update_updated_at_column();

create or replace function public.snapshot_cms_document_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_revision integer;
begin
  select coalesce(max(revision_number), 0) + 1 into v_revision from public.cms_revisions where document_id = old.id;
  insert into public.cms_revisions(document_id, editor_id, revision_number, snapshot)
  values(old.id, auth.uid(), v_revision, to_jsonb(old));
  return new;
end;
$$;
revoke all on function public.snapshot_cms_document_revision() from public, anon, authenticated;
create trigger snapshot_cms_document_revision before update on public.cms_documents for each row execute function public.snapshot_cms_document_revision();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cms-media','cms-media',true,10485760,array['image/jpeg','image/png','image/webp','image/gif','image/svg+xml'])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy "Staff uploads CMS media" on storage.objects for insert to authenticated with check (bucket_id='cms-media' and public.is_staff());
create policy "Staff updates CMS media" on storage.objects for update to authenticated using (bucket_id='cms-media' and public.is_staff()) with check (bucket_id='cms-media' and public.is_staff());
create policy "Staff deletes CMS media" on storage.objects for delete to authenticated using (bucket_id='cms-media' and public.is_staff());

revoke all on table public.cms_documents,public.cms_blocks,public.cms_revisions,public.cms_media from anon,authenticated;
grant select on table public.cms_documents,public.cms_blocks,public.cms_media to anon;
grant select,insert,update,delete on table public.cms_documents,public.cms_blocks,public.cms_revisions,public.cms_media to authenticated;

insert into public.cms_documents(document_type,slug,title,excerpt,body,category,tag,level,read_minutes,is_featured,seo_title,seo_description,og_title,og_description,status,published_at) values
('article','como-produzir-musica-em-casa','Como produzir musica em casa','Um guia pratico para montar seu fluxo de producao musical sem depender de um grande estudio.','Comece definindo um ambiente de trabalho consistente, escolha uma DAW, organize referencias e aprenda a finalizar pequenas producoes antes de ampliar seu equipamento.','Producao Musical','home-studio','Iniciante',8,true,'Como produzir musica em casa | Vivendo da Musica','Aprenda os fundamentos para produzir musica em casa com um fluxo simples e profissional.','Como produzir musica em casa','Guia pratico de producao musical para seu home studio.','published',now()),
('article','fundamentos-da-mixagem','Fundamentos da mixagem moderna','Entenda equilibrio, panorama, equalizacao e dinamica em uma mixagem musical.','Uma boa mixagem nasce do equilibrio. Ajuste volumes antes de adicionar plugins, use panorama para criar espaco e aplique equalizacao com intencao.','Mixagem','mixagem','Intermediario',10,true,'Fundamentos da mixagem moderna','Domine os pilares de uma mixagem equilibrada e musical.','Fundamentos da mixagem','Equilibrio, panorama, equalizacao e dinamica.','published',now()),
('article','direitos-autorais-para-produtores','Direitos autorais para produtores','Conheca os cuidados essenciais para proteger suas obras, beats e colaboracoes.','Documente cada colaboracao, defina percentuais antes do lancamento e mantenha contratos e arquivos que comprovem o processo criativo.','Carreira','direitos-autorais','Avancado',12,false,'Direitos autorais para produtores musicais','Proteja beats, obras e colaboracoes com boas praticas autorais.','Direitos autorais para produtores','Cuidados essenciais para proteger sua musica.','published',now());
