-- Reconcile the historical payout/reconciliation model with the lightweight
-- development portal contract introduced later on the Supabase dev branch.

alter table if exists public.producer_payout_methods
  add column if not exists verified boolean not null default false;

update public.producer_payout_methods
set verified = true
where status::text = 'verified'
  and verified = false;

-- Historical provider metadata remains available, but development/demo writes
-- must not be forced to fabricate processor credentials.
do $migration$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public'
      and table_name='producer_payout_methods'
      and column_name='provider'
  ) then
    execute 'alter table public.producer_payout_methods alter column provider drop not null';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public'
      and table_name='producer_payout_methods'
      and column_name='provider_destination_token'
  ) then
    execute 'alter table public.producer_payout_methods alter column provider_destination_token drop not null';
  end if;
end
$migration$;

alter table if exists public.producer_payout_requests
  add column if not exists processed_at timestamptz;

do $migration$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public'
      and table_name='producer_payout_requests'
      and column_name='idempotency_key'
  ) then
    execute 'alter table public.producer_payout_requests alter column idempotency_key set default gen_random_uuid()::text';
  end if;
end
$migration$;
