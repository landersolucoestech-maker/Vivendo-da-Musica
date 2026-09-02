create or replace function public.prevent_admin_audit_log_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'admin_audit_logs is append-only';
end;
$$;

revoke all on function public.prevent_admin_audit_log_mutation() from public, anon, authenticated, service_role;

drop trigger if exists admin_audit_logs_append_only on public.admin_audit_logs;
create trigger admin_audit_logs_append_only
before update or delete on public.admin_audit_logs
for each row execute function public.prevent_admin_audit_log_mutation();

revoke update, delete, truncate on table public.admin_audit_logs from anon, authenticated, service_role;

grant select, insert on table public.admin_audit_logs to authenticated;
grant select, insert on table public.admin_audit_logs to service_role;
