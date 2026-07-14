create type public.support_ticket_status as enum ('open', 'in_progress', 'resolved');
create type public.support_ticket_priority as enum ('low', 'medium', 'high');

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_code text not null default ('T-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))) unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  message text not null,
  status public.support_ticket_status not null default 'open',
  priority public.support_ticket_priority not null default 'medium',
  admin_response text,
  assigned_to uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_tickets_code_format check (ticket_code ~ '^T-[A-F0-9]{8}$'),
  constraint support_tickets_subject_length check (char_length(btrim(subject)) between 3 and 160),
  constraint support_tickets_message_length check (char_length(btrim(message)) between 10 and 5000),
  constraint support_tickets_response_length check (admin_response is null or char_length(btrim(admin_response)) between 2 and 5000),
  constraint support_tickets_resolution_consistency check (
    (status = 'resolved' and resolved_at is not null)
    or (status <> 'resolved' and resolved_at is null)
  )
);

create index support_tickets_user_created_idx on public.support_tickets (user_id, created_at desc);
create index support_tickets_status_created_idx on public.support_tickets (status, created_at desc);
create index support_tickets_assigned_idx on public.support_tickets (assigned_to) where assigned_to is not null;

create trigger update_support_tickets_updated_at
  before update on public.support_tickets
  for each row execute function public.update_updated_at_column();

create table public.support_faq (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_faq_question_length check (char_length(btrim(question)) between 5 and 240),
  constraint support_faq_answer_length check (char_length(btrim(answer)) between 10 and 5000)
);

create index support_faq_published_order_idx on public.support_faq (published, sort_order, created_at);

create trigger update_support_faq_updated_at
  before update on public.support_faq
  for each row execute function public.update_updated_at_column();

alter table public.support_tickets enable row level security;
alter table public.support_faq enable row level security;

create policy "Students and admins view support tickets"
  on public.support_tickets
  for select
  to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

create policy "Students open own support tickets"
  on public.support_tickets
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'open'
    and priority = 'medium'
    and assigned_to is null
    and admin_response is null
    and resolved_at is null
  );

create policy "Admins update support tickets"
  on public.support_tickets
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Published FAQ is visible to authenticated users"
  on public.support_faq
  for select
  to authenticated
  using (published or public.is_admin());

create policy "Admins create FAQ"
  on public.support_faq for insert to authenticated
  with check (public.is_admin());

create policy "Admins update FAQ"
  on public.support_faq for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Admins delete FAQ"
  on public.support_faq for delete to authenticated
  using (public.is_admin());

revoke all on table public.support_tickets, public.support_faq from anon, authenticated;
grant select, update on table public.support_tickets to authenticated;
grant insert (user_id, subject, message) on table public.support_tickets to authenticated;
grant select, insert, update, delete on table public.support_faq to authenticated;

insert into public.support_faq (question, answer, sort_order) values
  ('Como acesso minhas aulas?', 'Acesse a Area do Aluno, abra Meus Cursos e selecione o curso desejado para continuar.', 10),
  ('Como solicito reembolso?', 'Abra um ticket de suporte informando o numero do pedido e o motivo da solicitacao dentro do prazo aplicavel.', 20),
  ('Posso baixar os videos das aulas?', 'Os videos das aulas sao disponibilizados por streaming. Materiais autorizados aparecem como downloads dentro de cada aula.', 30);
