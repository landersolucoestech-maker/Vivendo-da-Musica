-- Consolidate community reads with group visibility/membership checks and
-- protect group ownership from direct client updates.

create or replace function app_private.protect_community_group_client_update()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if new.id is distinct from old.id
      or new.owner_id is distinct from old.owner_id
      or new.is_demo is distinct from old.is_demo
      or new.created_at is distinct from old.created_at then
      raise exception 'Identidade do grupo não pode ser alterada.';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function app_private.protect_community_group_client_update() from public, anon, authenticated;

drop trigger if exists protect_community_group_client_update on public.community_groups;
create trigger protect_community_group_client_update
before update on public.community_groups
for each row execute function app_private.protect_community_group_client_update();

-- Groups.
drop policy if exists "Public reads active public groups" on public.community_groups;
drop policy if exists community_groups_read on public.community_groups;

create policy community_groups_anon_read
on public.community_groups
for select
to anon
using (
  (visibility = 'public' and status = 'active')
  or is_demo = true
);

create policy community_groups_authenticated_read
on public.community_groups
for select
to authenticated
using (
  (visibility = 'public' and status = 'active')
  or owner_id = (select auth.uid())
  or public.is_platform_staff()
  or exists (
    select 1
    from public.community_group_members as member
    where member.group_id = community_groups.id
      and member.user_id = (select auth.uid())
      and member.status = 'active'
  )
);

drop policy if exists "Owners update groups" on public.community_groups;
drop policy if exists "Staff moderates community groups" on public.community_groups;
create policy community_groups_authenticated_update
on public.community_groups
for update
to authenticated
using (
  owner_id = (select auth.uid())
  or public.is_platform_staff()
)
with check (
  owner_id = (select auth.uid())
  or public.is_platform_staff()
);

-- Posts.
drop policy if exists "Public reads published community posts" on public.community_posts;
drop policy if exists community_posts_read on public.community_posts;

create policy community_posts_anon_read
on public.community_posts
for select
to anon
using (
  status = 'published'
  and (
    group_id is null
    or exists (
      select 1
      from public.community_groups as community_group
      where community_group.id = community_posts.group_id
        and community_group.status = 'active'
        and community_group.visibility = 'public'
    )
  )
);

create policy community_posts_authenticated_read
on public.community_posts
for select
to authenticated
using (
  author_id = (select auth.uid())
  or public.is_platform_staff()
  or (
    status = 'published'
    and (
      group_id is null
      or exists (
        select 1
        from public.community_groups as community_group
        where community_group.id = community_posts.group_id
          and community_group.status = 'active'
          and (
            community_group.visibility = 'public'
            or community_group.owner_id = (select auth.uid())
            or exists (
              select 1
              from public.community_group_members as member
              where member.group_id = community_group.id
                and member.user_id = (select auth.uid())
                and member.status = 'active'
            )
          )
      )
    )
  )
);

-- Comments inherit accessibility from their parent post.
drop policy if exists "Public reads published comments" on public.community_comments;
drop policy if exists community_comments_public_read on public.community_comments;

create policy community_comments_anon_read
on public.community_comments
for select
to anon
using (
  status = 'published'
  and exists (
    select 1
    from public.community_posts as community_post
    where community_post.id = community_comments.post_id
      and community_post.status = 'published'
      and (
        community_post.group_id is null
        or exists (
          select 1
          from public.community_groups as community_group
          where community_group.id = community_post.group_id
            and community_group.status = 'active'
            and community_group.visibility = 'public'
        )
      )
  )
);

create policy community_comments_authenticated_read
on public.community_comments
for select
to authenticated
using (
  author_id = (select auth.uid())
  or public.is_platform_staff()
  or (
    status = 'published'
    and exists (
      select 1
      from public.community_posts as community_post
      where community_post.id = community_comments.post_id
        and community_post.status = 'published'
        and (
          community_post.author_id = (select auth.uid())
          or community_post.group_id is null
          or exists (
            select 1
            from public.community_groups as community_group
            where community_group.id = community_post.group_id
              and community_group.status = 'active'
              and (
                community_group.visibility = 'public'
                or community_group.owner_id = (select auth.uid())
                or exists (
                  select 1
                  from public.community_group_members as member
                  where member.group_id = community_group.id
                    and member.user_id = (select auth.uid())
                    and member.status = 'active'
                )
              )
          )
        )
    )
  )
);
