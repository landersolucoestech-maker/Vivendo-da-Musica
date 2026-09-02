-- Phase 2: move RLS authorization checks behind app_private helpers without exposing app_private itself.

grant execute on function app_private.current_role() to anon, authenticated;
grant execute on function app_private.is_admin() to anon, authenticated;
grant execute on function app_private.is_staff() to anon, authenticated;
grant execute on function app_private.is_course_staff(uuid) to anon, authenticated;
grant execute on function app_private.is_enrolled(uuid) to anon, authenticated;
grant execute on function app_private.is_beat_owner(uuid) to anon, authenticated;

do $migration$
declare
  p record;
  statement text;
  rewrite_qual text;
  rewrite_check text;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname in ('public', 'storage')
      and (
        coalesce(qual, '') like '%is_admin(%'
        or coalesce(qual, '') like '%is_staff(%'
        or coalesce(qual, '') like '%is_course_staff(%'
        or coalesce(qual, '') like '%is_enrolled(%'
        or coalesce(qual, '') like '%is_beat_owner(%'
        or coalesce(qual, '') like '%current_role%'
        or coalesce(with_check, '') like '%is_admin(%'
        or coalesce(with_check, '') like '%is_staff(%'
        or coalesce(with_check, '') like '%is_course_staff(%'
        or coalesce(with_check, '') like '%is_enrolled(%'
        or coalesce(with_check, '') like '%is_beat_owner(%'
        or coalesce(with_check, '') like '%current_role%'
      )
  loop
    rewrite_qual := p.qual;
    rewrite_check := p.with_check;

    if rewrite_qual is not null then
      rewrite_qual := replace(rewrite_qual, 'current_role()', '__PRIVATE_CURRENT_ROLE__()');
      rewrite_qual := replace(rewrite_qual, '"current_role"()', '__PRIVATE_CURRENT_ROLE__()');
      rewrite_qual := replace(rewrite_qual, 'is_course_staff(', 'app_private.is_course_staff(');
      rewrite_qual := replace(rewrite_qual, 'is_beat_owner(', 'app_private.is_beat_owner(');
      rewrite_qual := replace(rewrite_qual, 'is_enrolled(', 'app_private.is_enrolled(');
      rewrite_qual := replace(rewrite_qual, 'is_admin()', 'app_private.is_admin()');
      rewrite_qual := replace(rewrite_qual, 'is_staff()', 'app_private.is_staff()');
      rewrite_qual := replace(rewrite_qual, '__PRIVATE_CURRENT_ROLE__()', 'app_private.current_role()');
    end if;

    if rewrite_check is not null then
      rewrite_check := replace(rewrite_check, 'current_role()', '__PRIVATE_CURRENT_ROLE__()');
      rewrite_check := replace(rewrite_check, '"current_role"()', '__PRIVATE_CURRENT_ROLE__()');
      rewrite_check := replace(rewrite_check, 'is_course_staff(', 'app_private.is_course_staff(');
      rewrite_check := replace(rewrite_check, 'is_beat_owner(', 'app_private.is_beat_owner(');
      rewrite_check := replace(rewrite_check, 'is_enrolled(', 'app_private.is_enrolled(');
      rewrite_check := replace(rewrite_check, 'is_admin()', 'app_private.is_admin()');
      rewrite_check := replace(rewrite_check, 'is_staff()', 'app_private.is_staff()');
      rewrite_check := replace(rewrite_check, '__PRIVATE_CURRENT_ROLE__()', 'app_private.current_role()');
    end if;

    statement := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    if rewrite_qual is not null then
      statement := statement || format(' using (%s)', rewrite_qual);
    end if;
    if rewrite_check is not null then
      statement := statement || format(' with check (%s)', rewrite_check);
    end if;
    execute statement;
  end loop;
end
$migration$;

-- Harden the moderation RPC during the transition. A follow-up migration returns it to SECURITY INVOKER
-- after proving RLS-based staff authorization remains equivalent.
create or replace function public.moderate_community_report(
  p_report_id uuid,
  p_action text,
  p_reason text
)
returns void
language plpgsql
security definer
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

  if not found then raise exception 'Report not found' using errcode = 'P0002'; end if;
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
    moderator_id, report_id, target_type, target_id, action, reason
  ) values (
    v_moderator, v_report.id, v_report.target_type, v_report.target_id, p_action, btrim(p_reason)
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
grant execute on function public.moderate_community_report(uuid,text,text) to authenticated;

-- Public aliases remain temporarily for owner-executed legacy RPC compatibility only.
revoke execute on function public.current_role() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon, authenticated;
revoke execute on function public.is_staff() from public, anon, authenticated;
revoke execute on function public.is_course_staff(uuid) from public, anon, authenticated;
revoke execute on function public.is_enrolled(uuid) from public, anon, authenticated;
revoke execute on function public.is_beat_owner(uuid) from public, anon, authenticated;
