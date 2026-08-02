-- Supabase installs pgcrypto functions in the extensions schema. Historical
-- trigger functions restricted their search_path to public and failed when
-- development fixtures published beats or generated contract hashes.

create or replace function public.register_beat_copyright()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  evidence_hash text;
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    evidence_hash := encode(
      digest(
        concat_ws('|', new.id::text, new.producer_id::text, new.title, coalesce(new.master_file_path, ''), now()::text),
        'sha256'
      ),
      'hex'
    );

    insert into public.beat_copyright_evidence (
      beat_id,
      producer_id,
      evidence_code,
      content_hash,
      metadata
    )
    values (
      new.id,
      new.producer_id,
      'VDA-BEAT-' || upper(substr(replace(new.id::text, '-', ''), 1, 12)),
      evidence_hash,
      jsonb_build_object(
        'title', new.title,
        'genre', new.genre,
        'published_at', coalesce(new.published_at, now())
      )
    )
    on conflict (evidence_code) do nothing;

    new.copyright_status := 'registered';
    new.published_at := coalesce(new.published_at, now());
  end if;

  return new;
end;
$$;

create or replace function public.set_beat_license_contract_hash()
returns trigger
language plpgsql
set search_path = public, extensions, pg_temp
as $$
begin
  new.contract_hash := encode(
    digest(convert_to(new.license_snapshot::text, 'UTF8'), 'sha256'),
    'hex'
  );
  return new;
end;
$$;

revoke all on function public.register_beat_copyright() from public, anon, authenticated;
revoke all on function public.set_beat_license_contract_hash() from public, anon, authenticated;
