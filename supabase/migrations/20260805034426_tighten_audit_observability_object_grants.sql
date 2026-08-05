-- Align object-level privileges with the existing RLS contract. Audit logs
-- allow anonymous demo reads plus authenticated staff reads/inserts. The
-- observability tables allow authenticated staff reads only. Service-role
-- ingestion remains unchanged.

revoke insert, update, delete, truncate, references, trigger
on table public.admin_audit_logs
from anon;

revoke update, delete, truncate, references, trigger
on table public.admin_audit_logs
from authenticated;

revoke usage, select, update
on sequence public.admin_audit_logs_id_seq
from anon;

revoke all privileges
on table
  public.observability_health_checks,
  public.observability_metric_samples,
  public.observability_request_traces
from anon;

revoke insert, update, delete, truncate, references, trigger
on table
  public.observability_health_checks,
  public.observability_metric_samples,
  public.observability_request_traces
from authenticated;

revoke usage, select, update
on sequence
  public.observability_health_checks_id_seq,
  public.observability_metric_samples_id_seq,
  public.observability_request_traces_id_seq
from anon, authenticated;
