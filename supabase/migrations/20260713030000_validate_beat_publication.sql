create or replace function public.validate_beat_before_publish()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.status = 'published' and old.status is distinct from new.status then
    if new.preview_file_path is null or new.master_file_path is null then
      raise exception 'Beat requires preview and master files before publishing';
    end if;
    if not exists (
      select 1 from public.beat_licenses
      where beat_id = new.id and available = true
    ) then
      raise exception 'Beat requires at least one available license before publishing';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.validate_beat_before_publish() from public, anon, authenticated;

create trigger validate_beat_before_publish
before update of status on public.beats
for each row execute function public.validate_beat_before_publish();
