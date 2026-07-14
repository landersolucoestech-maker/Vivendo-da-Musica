alter table public.event_registrations add column attendee_name_snapshot text not null default 'Participante';

create or replace function public.set_event_attendee_snapshot()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select coalesce(nullif(btrim(full_name), ''), 'Participante') into new.attendee_name_snapshot
  from public.user_profiles where user_id = new.user_id;
  new.attendee_name_snapshot := coalesce(new.attendee_name_snapshot, 'Participante');
  return new;
end;
$$;
revoke all on function public.set_event_attendee_snapshot() from public, anon, authenticated;
create trigger set_event_attendee_snapshot before insert on public.event_registrations for each row execute function public.set_event_attendee_snapshot();

create or replace function public.issue_event_certificate_after_attendance()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'attended' and old.status is distinct from new.status
     and exists (select 1 from public.events where id = new.event_id and certificate_enabled) then
    insert into public.event_certificates (event_id, user_id) values (new.event_id, new.user_id)
    on conflict (event_id, user_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.issue_event_certificate_after_attendance() from public, anon, authenticated;
create trigger issue_event_certificate_after_attendance after update of status on public.event_registrations for each row execute function public.issue_event_certificate_after_attendance();
