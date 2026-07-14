alter table public.beat_license_purchases add column contract_hash text;

create or replace function public.set_beat_license_contract_hash()
returns trigger language plpgsql set search_path = public as $$
begin
  new.contract_hash := encode(digest(convert_to(new.license_snapshot::text, 'UTF8'), 'sha256'), 'hex');
  return new;
end;
$$;
revoke all on function public.set_beat_license_contract_hash() from public;

create trigger set_beat_license_contract_hash_before_write
before insert or update of license_snapshot on public.beat_license_purchases
for each row execute function public.set_beat_license_contract_hash();

update public.beat_license_purchases set license_snapshot = license_snapshot where contract_hash is null;
alter table public.beat_license_purchases alter column contract_hash set not null;
