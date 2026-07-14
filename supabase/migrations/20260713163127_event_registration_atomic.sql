create or replace function public.enforce_event_registration_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_capacity integer;
  v_count integer;
  v_status public.event_status;
begin
  select capacity, registration_count, status
    into v_capacity, v_count, v_status
    from public.events
    where id = new.event_id
    for update;

  if not found or v_status not in ('upcoming', 'live') then
    raise exception 'Event is not open for registration';
  end if;
  if v_capacity is not null and v_count >= v_capacity then
    raise exception 'Event capacity reached';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_event_registration_capacity() from public, anon, authenticated;
create trigger enforce_event_registration_capacity
before insert on public.event_registrations
for each row execute function public.enforce_event_registration_capacity();
