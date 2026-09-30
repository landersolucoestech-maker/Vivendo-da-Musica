create table if not exists app_private.platform_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  staff_role text not null check (staff_role in ('admin', 'super_admin')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table app_private.platform_staff enable row level security;

revoke all on table app_private.platform_staff from public, anon, authenticated;
grant select, insert, update, delete on table app_private.platform_staff to service_role;

with staff_candidates as (
  select
    profile.user_id,
    profile.role::text as staff_role,
    coalesce(profile.created_at, now()) as granted_at
  from public.user_profiles profile
  where profile.role::text in ('admin', 'super_admin')

  union all

  select
    capability.user_id,
    capability.capability as staff_role,
    coalesce(capability.activated_at, capability.created_at, now()) as granted_at
  from public.account_capabilities capability
  where capability.capability in ('admin', 'super_admin')
    and capability.status = 'active'
),
ranked_staff as (
  select distinct on (user_id)
    user_id,
    staff_role,
    granted_at
  from staff_candidates
  order by
    user_id,
    (staff_role = 'super_admin') desc,
    granted_at asc
)
insert into app_private.platform_staff (
  user_id,
  staff_role,
  status,
  granted_at
)
select
  user_id,
  staff_role,
  'active',
  granted_at
from ranked_staff
on conflict (user_id) do update
set staff_role = case
      when app_private.platform_staff.staff_role = 'super_admin'
        or excluded.staff_role = 'super_admin'
        then 'super_admin'
      else 'admin'
    end,
    status = 'active',
    updated_at = now();

create or replace function app_private.is_platform_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from app_private.platform_staff staff
    where staff.user_id = (select auth.uid())
      and staff.status = 'active'
  );
$$;

create or replace function app_private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app_private.is_platform_staff();
$$;

create or replace function app_private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    app_private.is_platform_staff()
    or exists (
      select 1
      from public.account_capabilities capability
      where capability.user_id = (select auth.uid())
        and capability.capability = 'instructor'
        and capability.status = 'active'
    );
$$;

create or replace function app_private.is_course_staff(target_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    app_private.is_platform_staff()
    or exists (
      select 1
      from public.courses course_row
      where course_row.id = target_course_id
        and course_row.instructor_id = (select auth.uid())
    );
$$;

revoke all on function app_private.is_platform_staff() from public, anon, authenticated, service_role;
revoke all on function app_private.is_admin() from public, anon, authenticated, service_role;
revoke all on function app_private.is_staff() from public, anon, authenticated, service_role;
revoke all on function app_private.is_course_staff(uuid) from public, anon, authenticated, service_role;

grant usage on schema app_private to anon, authenticated, service_role;
revoke create on schema app_private from public, anon, authenticated, service_role;

grant execute on function app_private.is_platform_staff() to anon, authenticated, service_role;
grant execute on function app_private.is_admin() to anon, authenticated, service_role;
grant execute on function app_private.is_staff() to anon, authenticated, service_role;
grant execute on function app_private.is_course_staff(uuid) to anon, authenticated, service_role;

create or replace function public.is_platform_staff()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select app_private.is_platform_staff();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select app_private.is_platform_staff();
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select app_private.is_staff();
$$;

revoke all on function public.is_platform_staff() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.is_staff() from public;

grant execute on function public.is_platform_staff() to anon, authenticated, service_role;
grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.is_staff() to anon, authenticated, service_role;

create or replace function public.moderate_community_report(
  p_report_id uuid,
  p_action text,
  p_reason text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_report public.community_reports%rowtype;
  v_moderator uuid := auth.uid();
begin
  if v_moderator is null or not app_private.is_staff() then
    raise exception 'Only staff can moderate community reports' using errcode = '42501';
  end if;

  if p_action not in ('hide', 'remove', 'restore', 'dismiss') then
    raise exception 'Unsupported moderation action' using errcode = '22023';
  end if;

  if char_length(btrim(p_reason)) < 5 then
    raise exception 'Moderation reason must have at least 5 characters' using errcode = '22023';
  end if;

  select * into v_report
  from public.community_reports
  where id = p_report_id
  for update;

  if not found then
    raise exception 'Report not found' using errcode = 'P0002';
  end if;

  if v_report.status in ('resolved', 'dismissed') then
    raise exception 'Report already closed' using errcode = '23514';
  end if;

  if p_action <> 'dismiss' then
    if v_report.target_type = 'post' then
      update public.community_posts
      set status = case
        when p_action = 'restore' then 'published'::public.community_content_status
        when p_action = 'hide' then 'hidden'::public.community_content_status
        else 'removed'::public.community_content_status
      end
      where id = v_report.target_id;
    elsif v_report.target_type = 'comment' then
      update public.community_comments
      set status = case
        when p_action = 'restore' then 'published'::public.community_content_status
        when p_action = 'hide' then 'hidden'::public.community_content_status
        else 'removed'::public.community_content_status
      end
      where id = v_report.target_id;
    elsif v_report.target_type = 'group' then
      update public.community_groups
      set status = case
        when p_action = 'restore' then 'active'::public.community_group_status
        else 'archived'::public.community_group_status
      end
      where id = v_report.target_id;
    else
      raise exception 'User moderation requires the security workflow' using errcode = '42501';
    end if;
  end if;

  insert into public.community_moderation_actions (
    moderator_id,
    report_id,
    target_type,
    target_id,
    action,
    reason
  ) values (
    v_moderator,
    v_report.id,
    v_report.target_type,
    v_report.target_id,
    p_action,
    btrim(p_reason)
  );

  update public.community_reports
  set status = case
        when p_action = 'dismiss' then 'dismissed'::public.community_report_status
        else 'resolved'::public.community_report_status
      end,
      resolved_by = v_moderator,
      resolved_at = now()
  where id = v_report.id;
end;
$function$;

revoke all on function public.moderate_community_report(uuid,text,text) from public, anon;
grant execute on function public.moderate_community_report(uuid,text,text) to authenticated, service_role;
