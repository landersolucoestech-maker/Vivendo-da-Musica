begin;

alter table public.payout_requests drop constraint if exists payout_requests_status_check;
alter table public.payout_requests add constraint payout_requests_status_check
check (status in ('requested','processing','paid','failed','rejected','canceled'));

commit;
