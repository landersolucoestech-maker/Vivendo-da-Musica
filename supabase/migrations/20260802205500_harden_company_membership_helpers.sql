-- Membership checks rely on the caller's own RLS-visible membership rows.
-- SECURITY INVOKER avoids exposing privileged SECURITY DEFINER RPCs.

create or replace function public.is_company_member(target_company_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select public.is_platform_staff()
    or exists (
      select 1
      from public.company_members member
      where member.company_id = target_company_id
        and member.user_id = (select auth.uid())
        and member.status = 'active'
    );
$$;

create or replace function public.is_company_owner(target_company_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select public.is_platform_staff()
    or exists (
      select 1
      from public.company_members member
      where member.company_id = target_company_id
        and member.user_id = (select auth.uid())
        and member.member_role = 'owner'
        and member.status = 'active'
    );
$$;

revoke all on function public.is_company_member(uuid) from public, anon;
revoke all on function public.is_company_owner(uuid) from public, anon;
grant execute on function public.is_company_member(uuid) to authenticated, service_role;
grant execute on function public.is_company_owner(uuid) to authenticated, service_role;
