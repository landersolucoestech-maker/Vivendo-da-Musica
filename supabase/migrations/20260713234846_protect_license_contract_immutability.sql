create or replace function public.prevent_beat_license_contract_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.contract_number is distinct from old.contract_number
    or new.license_snapshot is distinct from old.license_snapshot
    or new.contract_hash is distinct from old.contract_hash then
    raise exception 'Issued beat license contract data is immutable';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_beat_license_contract_mutation() from public, anon, authenticated;

create trigger prevent_beat_license_contract_mutation
before update of contract_number, license_snapshot, contract_hash
on public.beat_license_purchases
for each row execute function public.prevent_beat_license_contract_mutation();
