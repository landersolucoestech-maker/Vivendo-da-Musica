-- Keep displayed counters derived from their canonical child records. Existing
-- demo fixtures contained manually entered totals that had drifted from the
-- underlying data.

create or replace function app_private.sync_opportunity_application_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  old_opportunity_id uuid := case when tg_op in ('UPDATE', 'DELETE') then old.opportunity_id else null end;
  new_opportunity_id uuid := case when tg_op in ('INSERT', 'UPDATE') then new.opportunity_id else null end;
begin
  if old_opportunity_id is not null then
    update public.opportunities as opportunity
    set application_count = (
          select count(*)::integer
          from public.opportunity_applications as application
          where application.opportunity_id = old_opportunity_id
            and application.status <> 'withdrawn'
        ),
        updated_at = now()
    where opportunity.id = old_opportunity_id;
  end if;

  if new_opportunity_id is not null
     and new_opportunity_id is distinct from old_opportunity_id then
    update public.opportunities as opportunity
    set application_count = (
          select count(*)::integer
          from public.opportunity_applications as application
          where application.opportunity_id = new_opportunity_id
            and application.status <> 'withdrawn'
        ),
        updated_at = now()
    where opportunity.id = new_opportunity_id;
  end if;

  return coalesce(new, old);
end;
$$;

revoke all on function app_private.sync_opportunity_application_count() from public, anon, authenticated;

drop trigger if exists opportunity_applications_sync_count on public.opportunity_applications;
create trigger opportunity_applications_sync_count
after insert or delete or update of opportunity_id, status
on public.opportunity_applications
for each row execute function app_private.sync_opportunity_application_count();

create or replace function app_private.sync_community_group_member_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  old_group_id uuid := case when tg_op in ('UPDATE', 'DELETE') then old.group_id else null end;
  new_group_id uuid := case when tg_op in ('INSERT', 'UPDATE') then new.group_id else null end;
begin
  if old_group_id is not null then
    update public.community_groups as community_group
    set member_count = (
          select count(*)::integer
          from public.community_group_members as member
          where member.group_id = old_group_id
        ),
        updated_at = now()
    where community_group.id = old_group_id;
  end if;

  if new_group_id is not null and new_group_id is distinct from old_group_id then
    update public.community_groups as community_group
    set member_count = (
          select count(*)::integer
          from public.community_group_members as member
          where member.group_id = new_group_id
        ),
        updated_at = now()
    where community_group.id = new_group_id;
  end if;

  return coalesce(new, old);
end;
$$;

revoke all on function app_private.sync_community_group_member_count() from public, anon, authenticated;

drop trigger if exists community_group_members_sync_count on public.community_group_members;
create trigger community_group_members_sync_count
after insert or delete or update of group_id
on public.community_group_members
for each row execute function app_private.sync_community_group_member_count();

create or replace function app_private.sync_community_post_like_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  old_post_id uuid := case when tg_op in ('UPDATE', 'DELETE') then old.post_id else null end;
  new_post_id uuid := case when tg_op in ('INSERT', 'UPDATE') then new.post_id else null end;
begin
  if old_post_id is not null then
    update public.community_posts as post
    set like_count = (
          select count(*)::integer
          from public.community_post_likes as post_like
          where post_like.post_id = old_post_id
        ),
        updated_at = now()
    where post.id = old_post_id;
  end if;

  if new_post_id is not null and new_post_id is distinct from old_post_id then
    update public.community_posts as post
    set like_count = (
          select count(*)::integer
          from public.community_post_likes as post_like
          where post_like.post_id = new_post_id
        ),
        updated_at = now()
    where post.id = new_post_id;
  end if;

  return coalesce(new, old);
end;
$$;

revoke all on function app_private.sync_community_post_like_count() from public, anon, authenticated;

drop trigger if exists community_post_likes_sync_count on public.community_post_likes;
create trigger community_post_likes_sync_count
after insert or delete or update of post_id
on public.community_post_likes
for each row execute function app_private.sync_community_post_like_count();

create or replace function app_private.sync_affiliate_link_conversion_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  old_link_id uuid := case when tg_op in ('UPDATE', 'DELETE') then old.affiliate_link_id else null end;
  new_link_id uuid := case when tg_op in ('INSERT', 'UPDATE') then new.affiliate_link_id else null end;
begin
  if old_link_id is not null then
    update public.affiliate_links as link
    set conversions_count = (
          select count(*)::bigint
          from public.affiliate_conversions as conversion
          where conversion.affiliate_link_id = old_link_id
        ),
        updated_at = now()
    where link.id = old_link_id;
  end if;

  if new_link_id is not null and new_link_id is distinct from old_link_id then
    update public.affiliate_links as link
    set conversions_count = (
          select count(*)::bigint
          from public.affiliate_conversions as conversion
          where conversion.affiliate_link_id = new_link_id
        ),
        updated_at = now()
    where link.id = new_link_id;
  end if;

  return coalesce(new, old);
end;
$$;

revoke all on function app_private.sync_affiliate_link_conversion_count() from public, anon, authenticated;

drop trigger if exists affiliate_conversions_sync_link_count on public.affiliate_conversions;
create trigger affiliate_conversions_sync_link_count
after insert or delete or update of affiliate_link_id
on public.affiliate_conversions
for each row execute function app_private.sync_affiliate_link_conversion_count();

update public.opportunities as opportunity
set application_count = (
      select count(*)::integer
      from public.opportunity_applications as application
      where application.opportunity_id = opportunity.id
        and application.status <> 'withdrawn'
    ),
    updated_at = now();

update public.community_groups as community_group
set member_count = (
      select count(*)::integer
      from public.community_group_members as member
      where member.group_id = community_group.id
    ),
    updated_at = now();

update public.community_posts as post
set like_count = (
      select count(*)::integer
      from public.community_post_likes as post_like
      where post_like.post_id = post.id
    ),
    updated_at = now();

update public.affiliate_links as link
set conversions_count = (
      select count(*)::bigint
      from public.affiliate_conversions as conversion
      where conversion.affiliate_link_id = link.id
    ),
    updated_at = now();
