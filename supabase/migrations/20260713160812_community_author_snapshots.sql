alter table public.community_posts
  add column author_name_snapshot text not null default 'Membro',
  add column author_role_snapshot text not null default 'student';

alter table public.community_comments
  add column author_name_snapshot text not null default 'Membro';

create or replace function public.set_community_author_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text;
  profile_role text;
begin
  select coalesce(nullif(btrim(full_name), ''), 'Membro'), role::text
  into profile_name, profile_role
  from public.user_profiles where user_id = new.author_id;

  new.author_name_snapshot := coalesce(profile_name, 'Membro');
  if tg_table_name = 'community_posts' then
    new.author_role_snapshot := coalesce(profile_role, 'student');
  end if;
  return new;
end;
$$;
revoke all on function public.set_community_author_snapshot() from public, anon, authenticated;

create trigger set_community_post_author_snapshot
before insert on public.community_posts
for each row execute function public.set_community_author_snapshot();

create trigger set_community_comment_author_snapshot
before insert on public.community_comments
for each row execute function public.set_community_author_snapshot();
