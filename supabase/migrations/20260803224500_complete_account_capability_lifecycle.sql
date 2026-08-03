begin;

create or replace function app_private.sync_profile_account_capabilities()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.account_capabilities (
    user_id, capability, status, is_default, requested_at, approved_at, metadata
  ) values (
    new.user_id, 'student', 'active', new.role = 'student', now(), now(), jsonb_build_object('source', 'profile_sync')
  )
  on conflict (user_id, capability) do update
  set status = 'active',
      approved_at = coalesce(public.account_capabilities.approved_at, now()),
      revoked_at = null,
      metadata = public.account_capabilities.metadata || jsonb_build_object('source', 'profile_sync'),
      updated_at = now();

  if new.role in ('instructor', 'producer', 'affiliate', 'company', 'admin', 'super_admin') then
    insert into public.account_capabilities (
      user_id, capability, status, is_default, requested_at, approved_at, metadata
    ) values (
      new.user_id, new.role, 'active', true, now(), now(), jsonb_build_object('source', 'profile_sync')
    )
    on conflict (user_id, capability) do update
    set status = 'active',
        is_default = true,
        approved_at = coalesce(public.account_capabilities.approved_at, now()),
        revoked_at = null,
        metadata = public.account_capabilities.metadata || jsonb_build_object('source', 'profile_sync'),
        updated_at = now();

    update public.account_capabilities
    set is_default = false,
        updated_at = now()
    where user_id = new.user_id
      and capability <> new.role
      and is_default;
  end if;

  return new;
end;
$$;

revoke all on function app_private.sync_profile_account_capabilities() from public, anon, authenticated;

drop trigger if exists sync_profile_account_capabilities on public.user_profiles;
create trigger sync_profile_account_capabilities
after insert or update of role
on public.user_profiles
for each row execute function app_private.sync_profile_account_capabilities();

create or replace function app_private.set_default_account_capability(
  target_user_id uuid,
  target_capability text
)
returns public.account_capabilities
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result public.account_capabilities;
begin
  if not exists (
    select 1 from public.account_capabilities
    where user_id = target_user_id
      and capability = target_capability
      and status = 'active'
  ) then
    raise exception 'Capacidade não está ativa para esta conta.';
  end if;

  update public.account_capabilities
  set is_default = false,
      updated_at = now()
  where user_id = target_user_id
    and is_default;

  update public.account_capabilities
  set is_default = true,
      updated_at = now()
  where user_id = target_user_id
    and capability = target_capability
  returning * into result;

  return result;
end;
$$;

revoke all on function app_private.set_default_account_capability(uuid, text) from public;
grant execute on function app_private.set_default_account_capability(uuid, text) to authenticated, service_role;

create or replace function public.set_default_account_capability(target_capability text)
returns public.account_capabilities
language plpgsql
security invoker
set search_path = public, app_private, pg_temp
as $$
begin
  if (select auth.uid()) is null then raise exception 'Autenticação obrigatória.'; end if;
  return app_private.set_default_account_capability((select auth.uid()), target_capability);
end;
$$;

create or replace function public.request_demo_account_capability(
  target_user_id uuid,
  target_capability text
)
returns public.account_capabilities
language plpgsql
security invoker
set search_path = public, app_private, pg_temp
as $$
begin
  if not exists (
    select 1 from public.user_profiles
    where user_id = target_user_id
      and is_demo
  ) then
    raise exception 'Identidade demonstrativa inválida.';
  end if;

  if target_capability not in ('instructor', 'producer', 'affiliate') then
    raise exception 'Capacidade deve ser ativada por fluxo específico.';
  end if;

  insert into public.account_capabilities (
    user_id, capability, status, is_default, requested_at, approved_at, metadata
  ) values (
    target_user_id, target_capability, 'active', false, now(), now(), jsonb_build_object('source', 'demo_request')
  )
  on conflict (user_id, capability) do update
  set status = 'active',
      approved_at = now(),
      revoked_at = null,
      metadata = public.account_capabilities.metadata || jsonb_build_object('source', 'demo_request'),
      updated_at = now();

  return (
    select capability_row
    from public.account_capabilities capability_row
    where capability_row.user_id = target_user_id
      and capability_row.capability = target_capability
  );
end;
$$;

create or replace function public.set_demo_default_account_capability(
  target_user_id uuid,
  target_capability text
)
returns public.account_capabilities
language plpgsql
security invoker
set search_path = public, app_private, pg_temp
as $$
begin
  if not exists (
    select 1 from public.user_profiles
    where user_id = target_user_id
      and is_demo
  ) then
    raise exception 'Identidade demonstrativa inválida.';
  end if;
  return app_private.set_default_account_capability(target_user_id, target_capability);
end;
$$;

revoke all on function public.set_default_account_capability(text) from public, anon;
grant execute on function public.set_default_account_capability(text) to authenticated, service_role;
revoke all on function public.request_demo_account_capability(uuid, text) from public;
grant execute on function public.request_demo_account_capability(uuid, text) to anon, authenticated, service_role;
revoke all on function public.set_demo_default_account_capability(uuid, text) from public;
grant execute on function public.set_demo_default_account_capability(uuid, text) to anon, authenticated, service_role;

commit;
