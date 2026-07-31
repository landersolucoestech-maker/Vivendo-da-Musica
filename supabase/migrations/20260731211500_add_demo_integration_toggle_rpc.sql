create or replace function public.toggle_demo_integration(integration_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare next_status text;
begin
  update public.platform_integrations
  set status = case when status='connected' then 'disconnected' else 'connected' end,
      updated_at = now()
  where display_name=integration_name and is_demo=true
  returning status into next_status;
  if next_status is null then raise exception 'Integração sintética não encontrada.'; end if;
  insert into public.admin_audit_logs(actor_name_snapshot,action,entity_type,entity_id,is_demo)
  values ('Administrador de Desenvolvimento','alternou integração','integração',integration_name,true);
  return next_status;
end;
$$;
revoke all on function public.toggle_demo_integration(text) from public;
grant execute on function public.toggle_demo_integration(text) to anon, authenticated;
