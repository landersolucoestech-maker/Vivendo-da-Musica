alter table public.beat_licenses
  add column if not exists license_contract_path text,
  add column if not exists license_contract_file_name text,
  add column if not exists license_contract_mime_type text,
  add column if not exists license_contract_size_bytes bigint,
  add column if not exists license_contract_updated_at timestamptz;

alter table public.beat_licenses
  drop constraint if exists beat_licenses_contract_metadata_consistent;

alter table public.beat_licenses
  add constraint beat_licenses_contract_metadata_consistent check (
    (
      license_contract_path is null
      and license_contract_file_name is null
      and license_contract_mime_type is null
      and license_contract_size_bytes is null
      and license_contract_updated_at is null
    )
    or
    (
      license_contract_path is not null
      and nullif(btrim(license_contract_file_name), '') is not null
      and license_contract_mime_type in (
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      )
      and license_contract_size_bytes > 0
      and license_contract_size_bytes <= 20971520
      and license_contract_updated_at is not null
    )
  );

comment on column public.beat_licenses.license_contract_path is 'Private Storage path for the producer-provided licensing contract template.';
comment on column public.beat_licenses.license_contract_file_name is 'Original file name of the licensing contract uploaded by the producer.';
comment on column public.beat_licenses.license_contract_mime_type is 'Validated MIME type of the licensing contract.';
comment on column public.beat_licenses.license_contract_size_bytes is 'Validated contract file size, limited to 20 MB.';
comment on column public.beat_licenses.license_contract_updated_at is 'Timestamp of the latest licensing contract upload.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'beat-license-contracts',
  'beat-license-contracts',
  false,
  20971520,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists beat_license_contracts_owner_read on storage.objects;
drop policy if exists beat_license_contracts_owner_insert on storage.objects;
drop policy if exists beat_license_contracts_owner_update on storage.objects;
drop policy if exists beat_license_contracts_owner_delete on storage.objects;

create policy beat_license_contracts_owner_read
on storage.objects
for select
to authenticated, anon
using (
  bucket_id = 'beat-license-contracts'
  and exists (
    select 1
    from public.beat_licenses license
    join public.beats beat on beat.id = license.beat_id
    where beat.id::text = (storage.foldername(objects.name))[2]
      and license.id::text = (storage.foldername(objects.name))[3]
      and (
        beat.producer_id::text = (storage.foldername(objects.name))[1]
        and beat.producer_id = (select auth.uid())
        or beat.is_demo
        or public.is_platform_staff()
      )
  )
);

create policy beat_license_contracts_owner_insert
on storage.objects
for insert
to authenticated, anon
with check (
  bucket_id = 'beat-license-contracts'
  and exists (
    select 1
    from public.beat_licenses license
    join public.beats beat on beat.id = license.beat_id
    where beat.id::text = (storage.foldername(objects.name))[2]
      and license.id::text = (storage.foldername(objects.name))[3]
      and beat.producer_id::text = (storage.foldername(objects.name))[1]
      and (
        beat.producer_id = (select auth.uid())
        or beat.is_demo
        or public.is_platform_staff()
      )
  )
);

create policy beat_license_contracts_owner_update
on storage.objects
for update
to authenticated, anon
using (
  bucket_id = 'beat-license-contracts'
  and exists (
    select 1
    from public.beat_licenses license
    join public.beats beat on beat.id = license.beat_id
    where beat.id::text = (storage.foldername(objects.name))[2]
      and license.id::text = (storage.foldername(objects.name))[3]
      and beat.producer_id::text = (storage.foldername(objects.name))[1]
      and (
        beat.producer_id = (select auth.uid())
        or beat.is_demo
        or public.is_platform_staff()
      )
  )
)
with check (
  bucket_id = 'beat-license-contracts'
  and exists (
    select 1
    from public.beat_licenses license
    join public.beats beat on beat.id = license.beat_id
    where beat.id::text = (storage.foldername(objects.name))[2]
      and license.id::text = (storage.foldername(objects.name))[3]
      and beat.producer_id::text = (storage.foldername(objects.name))[1]
      and (
        beat.producer_id = (select auth.uid())
        or beat.is_demo
        or public.is_platform_staff()
      )
  )
);

create policy beat_license_contracts_owner_delete
on storage.objects
for delete
to authenticated, anon
using (
  bucket_id = 'beat-license-contracts'
  and exists (
    select 1
    from public.beat_licenses license
    join public.beats beat on beat.id = license.beat_id
    where beat.id::text = (storage.foldername(objects.name))[2]
      and license.id::text = (storage.foldername(objects.name))[3]
      and beat.producer_id::text = (storage.foldername(objects.name))[1]
      and (
        beat.producer_id = (select auth.uid())
        or beat.is_demo
        or public.is_platform_staff()
      )
  )
);