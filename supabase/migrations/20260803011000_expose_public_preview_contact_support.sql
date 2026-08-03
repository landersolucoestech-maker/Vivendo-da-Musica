-- The public development preview runs without a user session, but the support
-- administration screen must still demonstrate persisted data. Keep the
-- legacy demo RPCs restricted and expose narrowly scoped preview-only wrappers
-- that can read or mutate records explicitly marked as demo data.

create or replace function public.list_public_preview_contact_messages()
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
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    contact.id,
    contact.name,
    contact.email,
    contact.subject,
    contact.message,
    contact.status,
    contact.source,
    contact.created_at,
    contact.updated_at
  from public.contact_messages as contact
  where contact.is_demo = true
  order by contact.created_at desc, contact.id;
$$;

create or replace function public.update_public_preview_contact_message_status(
  target_message_id uuid,
  target_status text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if target_status not in ('new', 'in_progress', 'resolved', 'archived') then
    raise exception 'Status inválido.' using errcode = '22023';
  end if;

  update public.contact_messages
     set status = target_status,
         updated_at = now()
   where id = target_message_id
     and is_demo = true;

  if not found then
    raise exception 'Mensagem de demonstração não encontrada.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.list_public_preview_contact_messages() from public, anon, authenticated;
revoke all on function public.update_public_preview_contact_message_status(uuid, text) from public, anon, authenticated;

grant execute on function public.list_public_preview_contact_messages() to anon, service_role;
grant execute on function public.update_public_preview_contact_message_status(uuid, text) to anon, service_role;
