begin;

alter table public.payout_destinations add column if not exists is_demo boolean not null default false;

update public.payout_destinations destination
set is_demo=profile.is_demo
from public.user_profiles profile
where profile.user_id=destination.owner_user_id;

insert into public.payout_destinations(owner_user_id,destination_type,display_label,verified,is_default,status,is_demo)
select profile.user_id,'pix','Pix demonstrativo do instrutor',true,true,'active',true
from public.user_profiles profile
where profile.role='instructor' and profile.is_demo
  and not exists(select 1 from public.payout_destinations destination where destination.owner_user_id=profile.user_id)
on conflict do nothing;

drop policy if exists payout_destinations_demo_read on public.payout_destinations;
create policy payout_destinations_demo_read on public.payout_destinations
for select to anon using(is_demo);

drop policy if exists payout_requests_demo_read on public.payout_requests;
create policy payout_requests_demo_read on public.payout_requests
for select to anon using(is_demo);

drop policy if exists payout_allocations_demo_read on public.payout_allocations;
create policy payout_allocations_demo_read on public.payout_allocations
for select to anon using(exists(select 1 from public.payout_requests request where request.id=payout_request_id and request.is_demo));

grant select on public.payout_destinations,public.payout_requests,public.payout_allocations,public.beneficiary_balances to anon;

create or replace function public.request_demo_unified_payout(
  target_owner_user_id uuid,
  target_destination_id uuid,
  target_beneficiary_type text,
  target_amount_cents bigint,
  target_currency text default 'BRL'
)
returns public.payout_requests
language plpgsql
security invoker
set search_path=public,app_private,pg_temp
as $$
begin
  if not exists(select 1 from public.user_profiles where user_id=target_owner_user_id and is_demo) then
    raise exception 'Identidade demonstrativa inválida.';
  end if;
  if not exists(select 1 from public.payout_destinations where id=target_destination_id and owner_user_id=target_owner_user_id and is_demo and verified and status='active') then
    raise exception 'Destino demonstrativo inválido.';
  end if;
  return app_private.request_unified_payout(target_owner_user_id,target_destination_id,target_beneficiary_type,target_amount_cents,target_currency,true);
end;
$$;

revoke all on function public.request_demo_unified_payout(uuid,uuid,text,bigint,text) from public;
grant execute on function public.request_demo_unified_payout(uuid,uuid,text,bigint,text) to anon,authenticated,service_role;

commit;
