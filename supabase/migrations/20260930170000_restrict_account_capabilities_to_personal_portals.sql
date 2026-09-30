do $preflight$
begin
  if exists (
    select 1
    from public.account_capabilities capability
    where capability.capability = 'company'
      and capability.status = 'active'
      and not exists (
        select 1
        from public.company_members member
        where member.user_id = capability.user_id
          and member.status = 'active'
      )
  ) then
    raise exception 'Cannot retire company capability while an active legacy capability lacks an active company membership.'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.account_capabilities capability
    where capability.capability in ('admin', 'super_admin')
      and capability.status = 'active'
      and not exists (
        select 1
        from app_private.platform_staff staff
        where staff.user_id = capability.user_id
          and staff.status = 'active'
      )
  ) then
    raise exception 'Cannot retire administrative capabilities while an active legacy capability lacks platform staff authority.'
      using errcode = '23514';
  end if;
end
$preflight$;

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
)
select
  profile.user_id,
  'student',
  'active',
  false,
  now(),
  now(),
  now(),
  null,
  jsonb_build_object('source', 'canonical_student_bootstrap')
from public.user_profiles profile
on conflict (user_id, capability) do update
set status = 'active',
    activated_at = coalesce(public.account_capabilities.activated_at, now()),
    approved_at = coalesce(public.account_capabilities.approved_at, now()),
    revoked_at = null,
    metadata = public.account_capabilities.metadata || jsonb_build_object('source', 'canonical_student_bootstrap'),
    updated_at = now();

with cleared_legacy_defaults as (
  update public.account_capabilities
  set is_default = false,
      updated_at = now()
  where capability in ('company', 'admin', 'super_admin')
    and is_default
  returning user_id
)
update public.account_capabilities student
set is_default = true,
    updated_at = now()
from cleared_legacy_defaults legacy
where student.user_id = legacy.user_id
  and student.capability = 'student'
  and student.status = 'active';

delete from public.account_capabilities
where capability in ('company', 'admin', 'super_admin');

drop trigger if exists sync_profile_account_capabilities on public.user_profiles;
drop trigger if exists sync_profile_capabilities_trigger on public.user_profiles;
drop trigger if exists sync_company_member_capability_trigger on public.company_members;

drop function if exists app_private.sync_profile_account_capabilities();
drop function if exists public.sync_profile_capabilities();
drop function if exists public.sync_company_member_capability();

create or replace function app_private.ensure_student_account_capability()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  should_be_default boolean;
begin
  select not exists (
    select 1
    from public.account_capabilities capability
    where capability.user_id = new.user_id
      and capability.is_default
  )
  into should_be_default;

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
    should_be_default,
    now(),
    now(),
    now(),
    null,
    jsonb_build_object('source', 'profile_bootstrap')
  )
  on conflict (user_id, capability) do update
  set status = 'active',
      is_default = case
        when exists (
          select 1
          from public.account_capabilities other
          where other.user_id = new.user_id
            and other.is_default
            and other.capability <> 'student'
        ) then public.account_capabilities.is_default
        else true
      end,
      activated_at = coalesce(public.account_capabilities.activated_at, now()),
      approved_at = coalesce(public.account_capabilities.approved_at, now()),
      revoked_at = null,
      metadata = public.account_capabilities.metadata || jsonb_build_object('source', 'profile_bootstrap'),
      updated_at = now();

  return new;
end;
$$;

revoke all on function app_private.ensure_student_account_capability()
from public, anon, authenticated, service_role;

create trigger ensure_student_account_capability
after insert on public.user_profiles
for each row
execute function app_private.ensure_student_account_capability();

alter table public.account_capabilities
  drop constraint if exists account_capabilities_capability_check;

alter table public.account_capabilities
  add constraint account_capabilities_capability_check
  check (capability in ('student', 'instructor', 'producer', 'affiliate'));

create or replace function public.request_account_capability(target_capability text)
returns public.account_capabilities
language plpgsql
set search_path = 'public', 'pg_temp'
as $$
declare
  normalized_capability text := lower(trim(coalesce(target_capability, '')));
  result public.account_capabilities;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if normalized_capability not in ('student', 'instructor', 'producer', 'affiliate') then
    raise exception 'Unsupported account capability.' using errcode = '22023';
  end if;

  insert into public.account_capabilities (
    user_id,
    capability,
    status,
    is_default,
    activated_at
  ) values (
    (select auth.uid()),
    normalized_capability,
    case when normalized_capability = 'student' then 'active' else 'pending' end,
    normalized_capability = 'student',
    case when normalized_capability = 'student' then now() else null end
  )
  on conflict (user_id, capability) do update
  set status = case
        when public.account_capabilities.status = 'active' then 'active'
        when normalized_capability = 'student' then 'active'
        else 'pending'
      end,
      requested_at = now(),
      activated_at = case
        when normalized_capability = 'student'
          then coalesce(public.account_capabilities.activated_at, now())
        else public.account_capabilities.activated_at
      end,
      updated_at = now()
  returning * into result;

  return result;
end;
$$;

create or replace function public.admin_set_account_capability(
  target_user_id uuid,
  target_capability text,
  target_status text,
  target_is_default boolean default false
)
returns public.account_capabilities
language plpgsql
set search_path = 'public', 'pg_temp'
as $$
declare
  normalized_capability text := lower(trim(coalesce(target_capability, '')));
  normalized_status text := lower(trim(coalesce(target_status, '')));
  result public.account_capabilities;
begin
  if not public.is_platform_staff() then
    raise exception 'Platform staff authorization is required.' using errcode = '42501';
  end if;

  if normalized_capability not in ('student', 'instructor', 'producer', 'affiliate') then
    raise exception 'Unsupported account capability.' using errcode = '22023';
  end if;

  if normalized_status not in ('pending', 'active', 'suspended', 'rejected') then
    raise exception 'Unsupported account capability status.' using errcode = '22023';
  end if;

  if target_is_default and normalized_status <> 'active' then
    raise exception 'The default account capability must be active.' using errcode = '23514';
  end if;

  if target_is_default then
    update public.account_capabilities
    set is_default = false,
        updated_at = now()
    where user_id = target_user_id
      and is_default;
  end if;

  insert into public.account_capabilities (
    user_id,
    capability,
    status,
    is_default,
    activated_at,
    approved_at,
    revoked_at,
    reviewed_at,
    reviewed_by
  ) values (
    target_user_id,
    normalized_capability,
    normalized_status,
    target_is_default,
    case when normalized_status = 'active' then now() else null end,
    case when normalized_status = 'active' then now() else null end,
    case when normalized_status in ('suspended', 'rejected') then now() else null end,
    now(),
    (select auth.uid())
  )
  on conflict (user_id, capability) do update
  set status = excluded.status,
      is_default = excluded.is_default,
      activated_at = case
        when excluded.status = 'active'
          then coalesce(public.account_capabilities.activated_at, now())
        else public.account_capabilities.activated_at
      end,
      approved_at = case
        when excluded.status = 'active'
          then coalesce(public.account_capabilities.approved_at, now())
        else public.account_capabilities.approved_at
      end,
      revoked_at = case
        when excluded.status in ('suspended', 'rejected') then now()
        else null
      end,
      reviewed_at = now(),
      reviewed_by = (select auth.uid()),
      updated_at = now()
  returning * into result;

  if not exists (
    select 1
    from public.account_capabilities capability
    where capability.user_id = target_user_id
      and capability.is_default
      and capability.status = 'active'
  ) then
    update public.account_capabilities
    set is_default = true,
        updated_at = now()
    where user_id = target_user_id
      and capability = 'student'
      and status = 'active';
  end if;

  return result;
end;
$$;

create or replace function app_private.set_default_account_capability(
  target_user_id uuid,
  target_capability text
)
returns public.account_capabilities
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_capability text := lower(trim(coalesce(target_capability, '')));
  result public.account_capabilities;
begin
  if normalized_capability not in ('student', 'instructor', 'producer', 'affiliate') then
    raise exception 'Unsupported account capability.' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.account_capabilities capability
    where capability.user_id = target_user_id
      and capability.capability = normalized_capability
      and capability.status = 'active'
  ) then
    raise exception 'The account capability is not active.' using errcode = '23514';
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
    and capability = normalized_capability
  returning * into result;

  return result;
end;
$$;

create or replace function public.set_default_account_capability(target_capability text)
returns public.account_capabilities
language plpgsql
set search_path = 'public', 'app_private', 'pg_temp'
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  return app_private.set_default_account_capability(
    (select auth.uid()),
    target_capability
  );
end;
$$;

create or replace function public.request_demo_account_capability(
  target_user_id uuid,
  target_capability text
)
returns public.account_capabilities
language plpgsql
set search_path = 'public', 'app_private', 'pg_temp'
as $$
begin
  if not exists (
    select 1
    from public.user_profiles profile
    where profile.user_id = target_user_id
      and profile.is_demo
  ) then
    raise exception 'The target identity is not a demo profile.' using errcode = '42501';
  end if;

  if target_capability not in ('instructor', 'producer', 'affiliate') then
    raise exception 'This capability must be activated through its canonical workflow.' using errcode = '22023';
  end if;

  insert into public.account_capabilities (
    user_id,
    capability,
    status,
    is_default,
    requested_at,
    approved_at,
    metadata
  ) values (
    target_user_id,
    target_capability,
    'active',
    false,
    now(),
    now(),
    jsonb_build_object('source', 'demo_request')
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
set search_path = 'public', 'app_private', 'pg_temp'
as $$
begin
  if not exists (
    select 1
    from public.user_profiles profile
    where profile.user_id = target_user_id
      and profile.is_demo
  ) then
    raise exception 'The target identity is not a demo profile.' using errcode = '42501';
  end if;

  return app_private.set_default_account_capability(
    target_user_id,
    target_capability
  );
end;
$$;
