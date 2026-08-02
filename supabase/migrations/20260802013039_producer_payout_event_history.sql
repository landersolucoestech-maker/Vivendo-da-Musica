create table if not exists public.producer_payout_events (
  id uuid primary key default gen_random_uuid(),
  payout_request_id uuid not null references public.producer_payout_requests(id) on delete restrict,
  producer_id uuid not null references public.user_profiles(user_id) on delete restrict,
  actor_id uuid,
  actor_role text not null,
  from_status text,
  to_status text not null,
  created_at timestamptz not null default now(),
  constraint producer_payout_events_from_status_check check (
    from_status is null or from_status in ('requested', 'processing', 'paid', 'failed', 'canceled')
  ),
  constraint producer_payout_events_to_status_check check (
    to_status in ('requested', 'processing', 'paid', 'failed', 'canceled')
  )
);

create index if not exists producer_payout_events_request_created_idx
  on public.producer_payout_events(payout_request_id, created_at);

create index if not exists producer_payout_events_producer_created_idx
  on public.producer_payout_events(producer_id, created_at desc);

alter table public.producer_payout_events enable row level security;

revoke all on table public.producer_payout_events from public, anon, authenticated;
grant select on table public.producer_payout_events to authenticated;
grant all on table public.producer_payout_events to service_role;

create policy producer_payout_events_owner_read
on public.producer_payout_events
for select
to authenticated
using (producer_id = (select auth.uid()) or public.is_platform_staff());

create policy producer_payout_events_demo_read
on public.producer_payout_events
for select
to anon
using (producer_id = '22222222-2222-4222-8222-222222222222'::uuid);

grant select on table public.producer_payout_events to anon;

create or replace function app_private.log_producer_payout_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_actor_id uuid := auth.uid();
  current_actor_role text;
begin
  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;

  select role into current_actor_role
  from public.user_profiles
  where user_id = current_actor_id;

  if current_actor_role is null then
    current_actor_role := case
      when new.producer_id = '22222222-2222-4222-8222-222222222222'::uuid then 'demo_system'
      else 'system'
    end;
  end if;

  insert into public.producer_payout_events (
    payout_request_id,
    producer_id,
    actor_id,
    actor_role,
    from_status,
    to_status
  ) values (
    new.id,
    new.producer_id,
    current_actor_id,
    current_actor_role,
    case when tg_op = 'INSERT' then null else old.status end,
    new.status
  );

  return new;
end;
$$;

revoke all on function app_private.log_producer_payout_event() from public, anon, authenticated;
grant execute on function app_private.log_producer_payout_event() to service_role;

drop trigger if exists producer_payout_requests_event_history on public.producer_payout_requests;
create trigger producer_payout_requests_event_history
after insert or update of status on public.producer_payout_requests
for each row
execute function app_private.log_producer_payout_event();
