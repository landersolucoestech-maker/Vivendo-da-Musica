begin;

create or replace function app_private.sync_profile_account_capabilities()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- The unique partial index permits a single default capability per user.
  -- Clear a previous default before promoting the profile role so the role
  -- transition remains atomic and cannot fail midway through the trigger.
  update public.account_capabilities
  set is_default = false,
      updated_at = now()
  where user_id = new.user_id
    and is_default
    and capability <> new.role::text;

  insert into public.account_capabilities (
    user_id,
    capability,
    status,
    is_default,
    requested_at,
    activated_at,
    approved_at,
    revoked_at,
    metadata
  ) values (
    new.user_id,
    'student',
    'active',
    new.role::text = 'student',
    now(),
    now(),
    now(),
    null,
    jsonb_build_object('source', 'profile_sync')
  )
  on conflict (user_id, capability) do update
  set status = 'active',
      is_default = excluded.is_default,
      activated_at = coalesce(public.account_capabilities.activated_at, now()),
      approved_at = coalesce(public.account_capabilities.approved_at, now()),
      revoked_at = null,
      metadata = public.account_capabilities.metadata || jsonb_build_object('source', 'profile_sync'),
      updated_at = now();

  if new.role::text in (
    'instructor', 'producer', 'affiliate', 'company', 'admin', 'super_admin'
  ) then
    insert into public.account_capabilities (
      user_id,
      capability,
      status,
      is_default,
      requested_at,
      activated_at,
      approved_at,
      revoked_at,
      metadata
    ) values (
      new.user_id,
      new.role::text,
      'active',
      true,
      now(),
      now(),
      now(),
      null,
      jsonb_build_object('source', 'profile_sync')
    )
    on conflict (user_id, capability) do update
    set status = 'active',
        is_default = true,
        activated_at = coalesce(public.account_capabilities.activated_at, now()),
        approved_at = coalesce(public.account_capabilities.approved_at, now()),
        revoked_at = null,
        metadata = public.account_capabilities.metadata || jsonb_build_object('source', 'profile_sync'),
        updated_at = now();
  end if;

  return new;
end;
$$;

revoke all on function app_private.sync_profile_account_capabilities()
from public, anon, authenticated;

drop trigger if exists sync_profile_account_capabilities on public.user_profiles;
create trigger sync_profile_account_capabilities
after insert or update of role
on public.user_profiles
for each row execute function app_private.sync_profile_account_capabilities();

commit;
