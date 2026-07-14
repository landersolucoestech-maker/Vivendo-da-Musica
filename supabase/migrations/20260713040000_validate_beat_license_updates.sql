alter table public.beat_licenses
add constraint beat_licenses_price_nonnegative check (price_cents >= 0),
add constraint beat_licenses_max_copies_positive check (max_copies is null or max_copies > 0);

create or replace function public.validate_beat_license_availability()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.available = true and exists (
    select 1 from public.beats
    where id = new.beat_id and exclusive_available = false
  ) then
    raise exception 'Licenses cannot be reactivated after an exclusive sale';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_beat_license_availability() from public, anon, authenticated;

create trigger validate_beat_license_availability
before insert or update of available on public.beat_licenses
for each row execute function public.validate_beat_license_availability();
