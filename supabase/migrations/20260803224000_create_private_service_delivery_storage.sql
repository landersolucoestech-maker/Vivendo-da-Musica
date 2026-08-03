begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'service-deliveries',
  'service-deliveries',
  false,
  1073741824,
  array[
    'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/flac',
    'video/mp4', 'video/webm', 'application/pdf', 'application/zip',
    'application/x-zip-compressed', 'application/octet-stream',
    'image/jpeg', 'image/png', 'image/webp'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists service_delivery_files_participant_read on storage.objects;
create policy service_delivery_files_participant_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'service-deliveries'
  and exists (
    select 1
    from public.service_contracts contract
    where contract.id = ((storage.foldername(objects.name))[1])::uuid
      and (
        contract.buyer_id = (select auth.uid())
        or contract.provider_id = (select auth.uid())
        or public.is_platform_staff()
      )
  )
);

drop policy if exists service_delivery_files_provider_insert on storage.objects;
create policy service_delivery_files_provider_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'service-deliveries'
  and exists (
    select 1
    from public.service_milestones milestone
    join public.service_contracts contract on contract.id = milestone.contract_id
    where contract.id = ((storage.foldername(objects.name))[1])::uuid
      and milestone.id = ((storage.foldername(objects.name))[2])::uuid
      and contract.provider_id = (select auth.uid())
      and contract.status not in ('completed', 'canceled', 'refunded')
  )
);

drop policy if exists service_delivery_files_provider_update on storage.objects;
create policy service_delivery_files_provider_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'service-deliveries'
  and exists (
    select 1
    from public.service_contracts contract
    where contract.id = ((storage.foldername(objects.name))[1])::uuid
      and (contract.provider_id = (select auth.uid()) or public.is_platform_staff())
  )
)
with check (
  bucket_id = 'service-deliveries'
  and exists (
    select 1
    from public.service_contracts contract
    where contract.id = ((storage.foldername(objects.name))[1])::uuid
      and (contract.provider_id = (select auth.uid()) or public.is_platform_staff())
  )
);

drop policy if exists service_delivery_files_provider_delete on storage.objects;
create policy service_delivery_files_provider_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'service-deliveries'
  and exists (
    select 1
    from public.service_contracts contract
    where contract.id = ((storage.foldername(objects.name))[1])::uuid
      and (contract.provider_id = (select auth.uid()) or public.is_platform_staff())
  )
);

commit;
