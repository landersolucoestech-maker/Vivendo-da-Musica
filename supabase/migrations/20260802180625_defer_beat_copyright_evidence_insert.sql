-- The historical BEFORE trigger attempted to insert a copyright-evidence child
-- before the parent beat existed, violating the beat_id foreign key. Keep the
-- parent-row normalization in BEFORE and persist evidence in an AFTER trigger.

create or replace function public.register_beat_copyright()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    new.copyright_status := 'registered';
    new.published_at := coalesce(new.published_at, now());
  end if;

  return new;
end;
$$;

create or replace function public.persist_beat_copyright_evidence()
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
        concat_ws('|', new.id::text, new.producer_id::text, new.title, coalesce(new.master_file_path, ''), new.published_at::text),
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
    ) values (
      new.id,
      new.producer_id,
      'VDA-BEAT-' || upper(substr(replace(new.id::text, '-', ''), 1, 12)),
      evidence_hash,
      jsonb_build_object(
        'title', new.title,
        'genre', new.genre,
        'published_at', new.published_at
      )
    )
    on conflict (evidence_code) do update
      set content_hash = excluded.content_hash,
          metadata = excluded.metadata,
          generated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists register_beat_copyright_evidence_after_publish on public.beats;
create trigger register_beat_copyright_evidence_after_publish
after insert or update of status on public.beats
for each row execute function public.persist_beat_copyright_evidence();

revoke all on function public.register_beat_copyright() from public, anon, authenticated;
revoke all on function public.persist_beat_copyright_evidence() from public, anon, authenticated;
