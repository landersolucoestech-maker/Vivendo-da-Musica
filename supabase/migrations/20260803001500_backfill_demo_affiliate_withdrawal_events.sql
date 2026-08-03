-- Historical demo withdrawals were seeded before the event-history trigger
-- existed. Backfill one canonical event only when no history is present.

insert into public.affiliate_withdrawal_events (
  withdrawal_id,
  affiliate_id,
  actor_id,
  actor_role,
  from_status,
  to_status,
  created_at
)
select
  withdrawal.id,
  withdrawal.affiliate_id,
  null,
  'demo_system',
  null,
  withdrawal.status,
  coalesce(withdrawal.processed_at, withdrawal.requested_at, withdrawal.created_at)
from public.affiliate_withdrawals as withdrawal
join public.affiliate_profiles as affiliate
  on affiliate.id = withdrawal.affiliate_id
 and affiliate.is_demo = true
where not exists (
  select 1
  from public.affiliate_withdrawal_events as event
  where event.withdrawal_id = withdrawal.id
);
