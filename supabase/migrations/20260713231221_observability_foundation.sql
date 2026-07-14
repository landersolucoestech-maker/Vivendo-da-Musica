create extension if not exists pg_cron;

create table public.observability_request_traces (
  id bigint generated always as identity primary key,
  trace_id uuid not null,
  request_id uuid not null,
  service text not null,
  route text not null,
  method text not null,
  status_code integer not null check (status_code between 100 and 599),
  duration_ms integer not null check (duration_ms >= 0),
  error_code text,
  occurred_at timestamptz not null default now(),
  unique (request_id)
);

create index observability_request_traces_service_time_idx
  on public.observability_request_traces (service, occurred_at desc);
create index observability_request_traces_status_time_idx
  on public.observability_request_traces (status_code, occurred_at desc);
create index observability_request_traces_trace_id_idx
  on public.observability_request_traces (trace_id);

create table public.observability_metric_samples (
  id bigint generated always as identity primary key,
  metric_name text not null,
  metric_value numeric not null,
  unit text not null,
  dimensions jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default now(),
  check (jsonb_typeof(dimensions) = 'object')
);

create index observability_metric_samples_name_time_idx
  on public.observability_metric_samples (metric_name, observed_at desc);

create table public.observability_health_checks (
  id bigint generated always as identity primary key,
  service text not null,
  status text not null check (status in ('healthy', 'degraded', 'unhealthy')),
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  details jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default now(),
  check (jsonb_typeof(details) = 'object')
);

create index observability_health_checks_service_time_idx
  on public.observability_health_checks (service, checked_at desc);

create table public.observability_alerts (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  service text not null,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  title text not null,
  description text not null,
  occurrence_count integer not null default 1 check (occurrence_count > 0),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  check (jsonb_typeof(metadata) = 'object')
);

create index observability_alerts_status_severity_idx
  on public.observability_alerts (status, severity, last_seen_at desc);

alter table public.observability_request_traces enable row level security;
alter table public.observability_metric_samples enable row level security;
alter table public.observability_health_checks enable row level security;
alter table public.observability_alerts enable row level security;

revoke all on public.observability_request_traces from anon, authenticated;
revoke all on public.observability_metric_samples from anon, authenticated;
revoke all on public.observability_health_checks from anon, authenticated;
revoke all on public.observability_alerts from anon, authenticated;
grant all on public.observability_request_traces to service_role;
grant all on public.observability_metric_samples to service_role;
grant all on public.observability_health_checks to service_role;
grant all on public.observability_alerts to service_role;
grant usage, select on all sequences in schema public to service_role;

create policy "Staff can read request traces"
  on public.observability_request_traces for select to authenticated
  using ((select public.is_staff()));
create policy "Staff can read metric samples"
  on public.observability_metric_samples for select to authenticated
  using ((select public.is_staff()));
create policy "Staff can read health checks"
  on public.observability_health_checks for select to authenticated
  using ((select public.is_staff()));
create policy "Staff can read observability alerts"
  on public.observability_alerts for select to authenticated
  using ((select public.is_staff()));
create policy "Admins can update observability alerts"
  on public.observability_alerts for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

grant select on public.observability_request_traces to authenticated;
grant select on public.observability_metric_samples to authenticated;
grant select on public.observability_health_checks to authenticated;
grant select, update on public.observability_alerts to authenticated;

create or replace function public.record_api_observation(
  p_trace_id uuid,
  p_request_id uuid,
  p_service text,
  p_route text,
  p_method text,
  p_status_code integer,
  p_duration_ms integer,
  p_error_code text default null
)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.observability_request_traces (
    trace_id, request_id, service, route, method, status_code, duration_ms, error_code
  ) values (
    p_trace_id, p_request_id, left(p_service, 80), left(p_route, 200), left(p_method, 12),
    p_status_code, p_duration_ms, left(p_error_code, 100)
  ) on conflict (request_id) do nothing;
$$;

revoke all on function public.record_api_observation(uuid, uuid, text, text, text, integer, integer, text) from public, anon, authenticated;
grant execute on function public.record_api_observation(uuid, uuid, text, text, text, integer, integer, text) to service_role;

create or replace function public.capture_observability_snapshot()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_webhook_backlog integer;
  v_webhook_failures integer;
  v_rate_limit_windows integer;
  v_error_rate numeric;
begin
  select count(*)::integer into v_webhook_backlog
  from public.webhook_receipts
  where processing_status = 'received' and received_at < now() - interval '5 minutes';

  select count(*)::integer into v_webhook_failures
  from public.webhook_receipts
  where processing_status = 'failed' and received_at >= now() - interval '1 hour';

  select count(*)::integer into v_rate_limit_windows
  from public.api_rate_limit_windows
  where updated_at >= now() - interval '5 minutes';

  select coalesce(
    100.0 * count(*) filter (where status_code >= 500) / nullif(count(*), 0), 0
  ) into v_error_rate
  from public.observability_request_traces
  where occurred_at >= now() - interval '5 minutes';

  insert into public.observability_metric_samples (metric_name, metric_value, unit) values
    ('webhook.backlog', v_webhook_backlog, 'items'),
    ('webhook.failures.1h', v_webhook_failures, 'items'),
    ('cache.rate_limit.active_windows', v_rate_limit_windows, 'windows'),
    ('api.error_rate.5m', round(v_error_rate, 2), 'percent');

  insert into public.observability_health_checks (service, status, details) values
    ('database', 'healthy', jsonb_build_object('source', 'scheduled_snapshot')),
    ('webhook-worker', case when v_webhook_failures > 0 then 'unhealthy' when v_webhook_backlog > 0 then 'degraded' else 'healthy' end,
      jsonb_build_object('backlog', v_webhook_backlog, 'failures_1h', v_webhook_failures)),
    ('rate-limit-cache', 'healthy', jsonb_build_object('active_windows_5m', v_rate_limit_windows));

  if v_webhook_backlog > 0 then
    insert into public.observability_alerts (fingerprint, service, severity, title, description, metadata)
    values ('webhook-backlog', 'webhook-worker', 'warning', 'Webhooks aguardando processamento',
      'Existem webhooks recebidos há mais de cinco minutos.', jsonb_build_object('backlog', v_webhook_backlog))
    on conflict (fingerprint) do update set status = 'open', last_seen_at = now(),
      occurrence_count = public.observability_alerts.occurrence_count + 1,
      metadata = excluded.metadata, resolved_at = null, resolved_by = null;
  else
    update public.observability_alerts set status = 'resolved', resolved_at = coalesce(resolved_at, now())
    where fingerprint = 'webhook-backlog' and status <> 'resolved';
  end if;

  if v_error_rate >= 5 then
    insert into public.observability_alerts (fingerprint, service, severity, title, description, metadata)
    values ('api-error-rate', 'api-v1', 'critical', 'Taxa elevada de erros da API',
      'A taxa de respostas 5xx nos últimos cinco minutos atingiu o limite de 5%.', jsonb_build_object('error_rate', round(v_error_rate, 2)))
    on conflict (fingerprint) do update set status = 'open', last_seen_at = now(),
      occurrence_count = public.observability_alerts.occurrence_count + 1,
      metadata = excluded.metadata, resolved_at = null, resolved_by = null;
  else
    update public.observability_alerts set status = 'resolved', resolved_at = coalesce(resolved_at, now())
    where fingerprint = 'api-error-rate' and status <> 'resolved';
  end if;
end;
$$;

revoke all on function public.capture_observability_snapshot() from public, anon, authenticated;
grant execute on function public.capture_observability_snapshot() to service_role;

create or replace function public.cleanup_observability_data()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.observability_request_traces where occurred_at < now() - interval '30 days';
  delete from public.observability_metric_samples where observed_at < now() - interval '90 days';
  delete from public.observability_health_checks where checked_at < now() - interval '90 days';
  delete from public.api_rate_limit_windows where updated_at < now() - interval '1 day';
  delete from public.api_idempotency_keys where expires_at < now();
end;
$$;

revoke all on function public.cleanup_observability_data() from public, anon, authenticated;
grant execute on function public.cleanup_observability_data() to service_role;

do $$
declare v_job record;
begin
  for v_job in select jobid from cron.job where jobname in ('observability-snapshot', 'observability-retention') loop
    perform cron.unschedule(v_job.jobid);
  end loop;
end $$;

select cron.schedule('observability-snapshot', '*/5 * * * *', 'select public.capture_observability_snapshot()');
select cron.schedule('observability-retention', '17 3 * * *', 'select public.cleanup_observability_data()');

comment on table public.observability_request_traces is 'Privacy-minimized application traces retained for 30 days.';
comment on table public.observability_metric_samples is 'Operational metric samples retained for 90 days.';
comment on table public.observability_health_checks is 'Scheduled service health snapshots retained for 90 days.';
