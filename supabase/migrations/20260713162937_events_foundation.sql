create type public.event_status as enum ('draft', 'upcoming', 'live', 'replay', 'cancelled');
create type public.event_registration_status as enum ('confirmed', 'cancelled', 'attended');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid references auth.users(id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(btrim(title)) between 5 and 180),
  description text not null check (char_length(btrim(description)) between 20 and 5000),
  category text not null check (char_length(btrim(category)) between 3 and 60),
  host_name text not null check (char_length(btrim(host_name)) between 2 and 120),
  speakers text[] not null default '{}',
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  timezone text not null default 'America/Sao_Paulo',
  location text not null check (char_length(btrim(location)) between 2 and 200),
  capacity integer check (capacity is null or capacity > 0),
  registration_count integer not null default 0 check (registration_count >= 0),
  status public.event_status not null default 'draft',
  cover_url text,
  certificate_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.event_agenda_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  starts_at timestamptz not null,
  title text not null check (char_length(btrim(title)) between 3 and 200),
  position integer not null check (position >= 0),
  unique (event_id, position)
);

create table public.event_registrations (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status public.event_registration_status not null default 'confirmed',
  registered_at timestamptz not null default now(),
  attended_at timestamptz,
  primary key (event_id, user_id)
);

create table public.event_streams (
  event_id uuid primary key references public.events(id) on delete cascade,
  live_url text,
  replay_url text,
  updated_at timestamptz not null default now()
);

create table public.event_certificates (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  verification_code uuid not null default gen_random_uuid() unique,
  issued_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index events_public_schedule_idx on public.events (status, starts_at);
create index events_organizer_idx on public.events (organizer_id);
create index event_agenda_event_idx on public.event_agenda_items (event_id, position);
create index event_registrations_user_idx on public.event_registrations (user_id, status, registered_at desc);
create index event_certificates_user_idx on public.event_certificates (user_id, issued_at desc);

alter table public.events enable row level security;
alter table public.event_agenda_items enable row level security;
alter table public.event_registrations enable row level security;
alter table public.event_streams enable row level security;
alter table public.event_certificates enable row level security;

create policy "Public reads published events" on public.events for select
using (status in ('upcoming', 'live', 'replay') or public.is_staff());
create policy "Staff creates events" on public.events for insert to authenticated with check (public.is_staff());
create policy "Staff updates events" on public.events for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "Staff deletes events" on public.events for delete to authenticated using (public.is_staff());

create policy "Public reads published event agenda" on public.event_agenda_items for select
using (exists (select 1 from public.events e where e.id = event_id and e.status in ('upcoming', 'live', 'replay')) or public.is_staff());
create policy "Staff manages event agenda" on public.event_agenda_items for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "Users read own event registrations" on public.event_registrations for select to authenticated
using (user_id = (select auth.uid()) or public.is_staff());
create policy "Users register themselves" on public.event_registrations for insert to authenticated
with check (user_id = (select auth.uid()) and status = 'confirmed' and exists (select 1 from public.events e where e.id = event_id and e.status in ('upcoming', 'live') and (e.capacity is null or e.registration_count < e.capacity)));
create policy "Users cancel own registration" on public.event_registrations for delete to authenticated
using (user_id = (select auth.uid()) or public.is_staff());
create policy "Staff updates event attendance" on public.event_registrations for update to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "Registered users access event streams" on public.event_streams for select to authenticated
using (public.is_staff() or exists (select 1 from public.event_registrations r where r.event_id = event_streams.event_id and r.user_id = (select auth.uid()) and r.status in ('confirmed', 'attended')));
create policy "Staff manages event streams" on public.event_streams for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "Users read own event certificates" on public.event_certificates for select to authenticated
using (user_id = (select auth.uid()) or public.is_staff());
create policy "Staff issues event certificates" on public.event_certificates for insert to authenticated with check (public.is_staff());

create trigger update_events_updated_at before update on public.events for each row execute function public.update_updated_at_column();
create trigger update_event_streams_updated_at before update on public.event_streams for each row execute function public.update_updated_at_column();

create or replace function public.sync_event_registration_count()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.events set registration_count = (select count(*) from public.event_registrations where event_id = coalesce(new.event_id, old.event_id) and status in ('confirmed', 'attended')) where id = coalesce(new.event_id, old.event_id);
  return coalesce(new, old);
end;
$$;
revoke all on function public.sync_event_registration_count() from public, anon, authenticated;
create trigger sync_event_registration_count after insert or update of status or delete on public.event_registrations for each row execute function public.sync_event_registration_count();

revoke all on table public.events, public.event_agenda_items, public.event_registrations, public.event_streams, public.event_certificates from anon, authenticated;
grant select on table public.events, public.event_agenda_items to anon;
grant select, insert, update, delete on table public.events, public.event_agenda_items to authenticated;
grant select, insert, update, delete on table public.event_registrations to authenticated;
grant select, insert, update, delete on table public.event_streams to authenticated;
grant select, insert on table public.event_certificates to authenticated;

insert into public.events (slug, title, description, category, host_name, speakers, starts_at, ends_at, location, capacity, status, certificate_enabled) values
('workshop-mixagem-fab-dupont', 'Workshop de Mixagem com Fab Dupont', 'Workshop pratico de mixagem cobrindo equalizacao, compressao e automacao em uma faixa real.', 'Workshop', 'Fab Dupont', array['Fab Dupont','Mariana Costa'], '2026-08-01 19:00:00-03', '2026-08-01 21:00:00-03', 'Online', 500, 'upcoming', true),
('masterclass-producao-joao-millen', 'Masterclass Producao com Joao Millen', 'Fluxo de trabalho completo de producao musical, desde a criacao do beat ate o master final.', 'Masterclass', 'Joao Millen', array['Joao Millen'], '2026-08-22 19:00:00-03', '2026-08-22 21:00:00-03', 'Online', 500, 'upcoming', true),
('live-carreira-musical-luan-teles', 'Live: Carreira Musical com Luan Teles', 'Conversa aprofundada sobre como construir uma carreira sustentavel como produtor musical independente.', 'Live', 'Luan Teles', array['Luan Teles','Rafael Andrade'], '2026-07-13 19:00:00-03', '2026-07-13 21:00:00-03', 'Online', null, 'live', false),
('imersao-beatmaking-chiocki', 'Imersao Beatmaking com Chiocki', 'Imersao dedicada a criacao de beats do zero, com pratica guiada e apresentacao dos resultados.', 'Imersao', 'Chiocki', array['Chiocki'], '2026-06-06 10:00:00-03', '2026-06-06 18:00:00-03', 'Sao Paulo, SP', 80, 'replay', true);

insert into public.event_agenda_items (event_id, starts_at, title, position)
select id, starts_at, 'Abertura e apresentacao', 0 from public.events where slug = 'workshop-mixagem-fab-dupont'
union all select id, starts_at + interval '15 minutes', 'Mixagem em tempo real', 1 from public.events where slug = 'workshop-mixagem-fab-dupont'
union all select id, starts_at, 'Criacao do beat', 0 from public.events where slug = 'masterclass-producao-joao-millen'
union all select id, starts_at + interval '45 minutes', 'Arranjo e producao', 1 from public.events where slug = 'masterclass-producao-joao-millen'
union all select id, starts_at, 'Bate-papo aberto', 0 from public.events where slug = 'live-carreira-musical-luan-teles'
union all select id, starts_at, 'Fundamentos do beat', 0 from public.events where slug = 'imersao-beatmaking-chiocki';

insert into public.event_streams (event_id, live_url, replay_url)
select id, 'https://example.com/live/' || slug, null from public.events where status in ('upcoming','live')
union all select id, null, 'https://example.com/replay/' || slug from public.events where status = 'replay';
