-- Public buckets can serve object URLs without a broad storage.objects SELECT
-- policy. Removing the policy prevents anonymous clients from listing every
-- object while preserving direct public image delivery.
drop policy if exists academy_images_public_read on storage.objects;

-- The preview support wrappers no longer need SECURITY DEFINER. Give the anon
-- role only the table privileges required by these two narrowly scoped
-- operations and let RLS remain the row boundary.
revoke delete on table public.contact_messages from anon;
revoke update on table public.contact_messages from anon;
grant update (status, updated_at) on table public.contact_messages to anon;

drop policy if exists contact_messages_preview_demo_select on public.contact_messages;
create policy contact_messages_preview_demo_select
on public.contact_messages
for select
to anon
using (is_demo = true);

drop policy if exists contact_messages_preview_demo_update on public.contact_messages;
create policy contact_messages_preview_demo_update
on public.contact_messages
for update
to anon
using (is_demo = true)
with check (
  is_demo = true
  and status in ('new', 'in_progress', 'resolved', 'archived')
);

alter function public.list_public_preview_contact_messages() security invoker;
alter function public.update_public_preview_contact_message_status(uuid, text) security invoker;

-- Historical demo helpers remain service-only, but they also do not need
-- elevated execution privileges.
alter function public.list_demo_contact_messages() security invoker;
alter function public.update_demo_contact_message_status(uuid, text) security invoker;
