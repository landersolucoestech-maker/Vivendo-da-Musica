create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) between 5 and 320),
  subject text not null check (char_length(subject) between 3 and 180),
  message text not null check (char_length(message) between 10 and 5000),
  status text not null default 'new' check (status in ('new','in_progress','resolved','archived')),
  source text not null default 'public_contact' check (source in ('public_contact','student_support')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

create policy contact_messages_public_insert
on public.contact_messages
for insert
to anon, authenticated
with check (
  status = 'new'
  and source = 'public_contact'
  and char_length(name) between 2 and 120
  and char_length(email) between 5 and 320
  and char_length(subject) between 3 and 180
  and char_length(message) between 10 and 5000
);

create policy contact_messages_staff_select
on public.contact_messages
for select
to authenticated
using (is_platform_staff());

create policy contact_messages_staff_update
on public.contact_messages
for update
to authenticated
using (is_platform_staff())
with check (is_platform_staff());

create index if not exists contact_messages_status_created_idx
  on public.contact_messages (status, created_at desc);
