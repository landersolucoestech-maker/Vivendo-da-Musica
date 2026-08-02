create table if not exists public.affiliate_withdrawal_events (
  id uuid primary key default gen_random_uuid(),
  withdrawal_id uuid not null references public.affiliate_withdrawals(id) on delete restrict,
  affiliate_id uuid not null references public.affiliate_profiles(id) on delete restrict,
  actor_id uuid,
  actor_role text not null,
  from_status text,
  to_status text not null,
  created_at timestamptz not null default now(),
  constraint affiliate_withdrawal_events_from_status_check check (
    from_status is null or from_status in ('requested', 'processing', 'paid', 'rejected', 'canceled')
  ),
  constraint affiliate_withdrawal_events_to_status_check check (
    to_status in ('requested', 'processing', 'paid', 'rejected', 'canceled')
  )
);

create index if not exists affiliate_withdrawal_events_withdrawal_created_idx
  on public.affiliate_withdrawal_events(withdrawal_id, created_at);

create index if not exists affiliate_withdrawal_events_affiliate_created_idx
  on public.affiliate_withdrawal_events(affiliate_id, created_at desc);

alter table public.affiliate_withdrawal_events enable row level security;

revoke all on table public.affiliate_withdrawal_events from public, anon, authenticated;
grant select on table public.affiliate_withdrawal_events to authenticated;
grant all on table public.affiliate_withdrawal_events to service_role;

create policy affiliate_withdrawal_events_staff_read
on public.affiliate_withdrawal_events
for select
to authenticated
using (public.is_platform_staff());

create policy affiliate_withdrawal_events_demo_read
on public.affiliate_withdrawal_events
for select
to anon
using (
  exists (
    select 1 from public.affiliate_profiles p
    where p.id = affiliate_withdrawal_events.affiliate_id
      and p.is_demo = true
  )
);

grant select on table public.affiliate_withdrawal_events to anon;

create or replace function app_private.log_affiliate_withdrawal_event()
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
      when exists (
        select 1 from public.affiliate_profiles p
        where p.id = new.affiliate_id and p.is_demo = true
      ) then 'demo_system'
      else 'system'
    end;
  end if;

  insert into public.affiliate_withdrawal_events (
    withdrawal_id,
    affiliate_id,
    actor_id,
    actor_role,
    from_status,
    to_status
  ) values (
    new.id,
    new.affiliate_id,
    current_actor_id,
    current_actor_role,
    case when tg_op = 'INSERT' then null else old.status end,
    new.status
  );

  return new;
end;
$$;

revoke all on function app_private.log_affiliate_withdrawal_event() from public, anon, authenticated;
grant execute on function app_private.log_affiliate_withdrawal_event() to service_role;

drop trigger if exists affiliate_withdrawals_event_history on public.affiliate_withdrawals;
create trigger affiliate_withdrawals_event_history
after insert or update of status on public.affiliate_withdrawals
for each row
execute function app_private.log_affiliate_withdrawal_event();
