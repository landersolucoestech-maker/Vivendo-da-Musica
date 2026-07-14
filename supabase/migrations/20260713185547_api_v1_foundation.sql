create table public.api_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  idempotency_key text not null,
  request_hash text not null,
  response_status integer,
  response_body jsonb,
  state text not null default 'processing' check (state in ('processing', 'completed', 'failed')),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scope, idempotency_key)
);

create index api_idempotency_keys_expires_at_idx
  on public.api_idempotency_keys (expires_at);

create table public.api_rate_limit_windows (
  actor_hash text not null,
  route_key text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  updated_at timestamptz not null default now(),
  primary key (actor_hash, route_key, window_started_at)
);

create index api_rate_limit_windows_updated_at_idx
  on public.api_rate_limit_windows (updated_at);

create table public.webhook_receipts (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_event_id text not null,
  event_type text not null,
  payload_hash text not null,
  processing_status text not null default 'received'
    check (processing_status in ('received', 'processed', 'ignored', 'failed')),
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, external_event_id)
);

create index webhook_receipts_status_received_idx
  on public.webhook_receipts (processing_status, received_at desc);

alter table public.api_idempotency_keys enable row level security;
alter table public.api_rate_limit_windows enable row level security;
alter table public.webhook_receipts enable row level security;

revoke all on public.api_idempotency_keys from anon, authenticated;
revoke all on public.api_rate_limit_windows from anon, authenticated;
revoke all on public.webhook_receipts from anon, authenticated;
grant all on public.api_idempotency_keys to service_role;
grant all on public.api_rate_limit_windows to service_role;
grant all on public.webhook_receipts to service_role;

create policy "Staff can read API idempotency records"
  on public.api_idempotency_keys for select
  to authenticated
  using ((select public.is_staff()));

create policy "Staff can read API rate limits"
  on public.api_rate_limit_windows for select
  to authenticated
  using ((select public.is_staff()));

create policy "Staff can read webhook receipts"
  on public.webhook_receipts for select
  to authenticated
  using ((select public.is_staff()));

grant select on public.api_idempotency_keys to authenticated;
grant select on public.api_rate_limit_windows to authenticated;
grant select on public.webhook_receipts to authenticated;

create or replace function public.consume_api_rate_limit(
  p_actor_hash text,
  p_route_key text,
  p_limit integer default 60,
  p_window_seconds integer default 60
)
returns table (allowed boolean, remaining integer, retry_after_seconds integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_count integer;
begin
  if p_limit < 1 or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'Invalid rate limit configuration';
  end if;

  v_window := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  insert into public.api_rate_limit_windows (
    actor_hash, route_key, window_started_at, request_count, updated_at
  ) values (
    p_actor_hash, p_route_key, v_window, 1, now()
  )
  on conflict (actor_hash, route_key, window_started_at)
  do update set
    request_count = public.api_rate_limit_windows.request_count + 1,
    updated_at = now()
  returning request_count into v_count;

  return query select
    v_count <= p_limit,
    greatest(p_limit - v_count, 0),
    greatest(ceil(extract(epoch from (v_window + make_interval(secs => p_window_seconds) - clock_timestamp())))::integer, 0);
end;
$$;

revoke all on function public.consume_api_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, text, integer, integer) to service_role;

comment on table public.api_idempotency_keys is 'Server-only replay cache for idempotent API mutations.';
comment on table public.api_rate_limit_windows is 'Server-only fixed-window counters for Edge API rate limiting.';
comment on table public.webhook_receipts is 'Metadata-only webhook receipt log; raw provider payloads are intentionally not retained.';
