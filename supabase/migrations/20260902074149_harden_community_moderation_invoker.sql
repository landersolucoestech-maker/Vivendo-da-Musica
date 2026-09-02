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
  if v_moderator is null or not exists (
    select 1
    from public.user_profiles
    where user_id = v_moderator
      and role::text in ('instructor','admin','super_admin')
  ) then
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
