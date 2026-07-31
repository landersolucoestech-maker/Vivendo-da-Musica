alter table public.contact_messages
  add column if not exists is_demo boolean not null default false;

drop policy if exists contact_messages_public_insert on public.contact_messages;
create policy contact_messages_public_insert
on public.contact_messages
for insert
to anon, authenticated
with check (
  is_demo = false
  and status = 'new'
  and source = 'public_contact'
  and char_length(name) between 2 and 120
  and char_length(email) between 5 and 320
  and char_length(subject) between 3 and 180
  and char_length(message) between 10 and 5000
);

insert into public.contact_messages (id, name, email, subject, message, status, source, is_demo, created_at)
values
  ('cd100000-0000-4000-8000-000000000001'::uuid, 'Aluno de Desenvolvimento', 'aluno@example.test', 'Dúvida sobre materiais', 'Não encontrei o material complementar da aula de configuração da DAW.', 'new', 'public_contact', true, now() - interval '2 days'),
  ('cd100000-0000-4000-8000-000000000002'::uuid, 'Produtor de Desenvolvimento', 'produtor@example.test', 'Publicação de produto', 'Preciso revisar os requisitos para publicar um novo produto digital.', 'in_progress', 'public_contact', true, now() - interval '1 day')
on conflict (id) do nothing;

create or replace function public.list_demo_contact_messages()
returns table (
  id uuid,
  name text,
  email text,
  subject text,
  message text,
  status text,
  source text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select m.id, m.name, m.email, m.subject, m.message, m.status, m.source, m.created_at, m.updated_at
  from public.contact_messages m
  where m.is_demo = true
  order by m.created_at desc;
$$;

create or replace function public.update_demo_contact_message_status(
  target_message_id uuid,
  target_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_status not in ('new', 'in_progress', 'resolved', 'archived') then
    raise exception 'Status inválido.';
  end if;

  update public.contact_messages
     set status = target_status,
         updated_at = now()
   where id = target_message_id
     and is_demo = true;

  if not found then
    raise exception 'Mensagem de demonstração não encontrada.';
  end if;
end;
$$;

revoke all on function public.list_demo_contact_messages() from public;
revoke all on function public.update_demo_contact_message_status(uuid, text) from public;
grant execute on function public.list_demo_contact_messages() to anon, authenticated;
grant execute on function public.update_demo_contact_message_status(uuid, text) to anon, authenticated;
