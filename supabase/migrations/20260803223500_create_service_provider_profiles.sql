begin;

create table if not exists public.service_provider_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  headline text,
  bio text,
  avatar_url text,
  location text,
  verified boolean not null default false,
  active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_service_provider_profiles_updated_at on public.service_provider_profiles;
create trigger set_service_provider_profiles_updated_at
before update on public.service_provider_profiles
for each row execute function public.set_updated_at();

alter table public.service_provider_profiles enable row level security;

create policy service_provider_profiles_public_read
on public.service_provider_profiles
for select to anon, authenticated
using (active or user_id = (select auth.uid()) or public.is_platform_staff());

create policy service_provider_profiles_owner_insert
on public.service_provider_profiles
for insert to authenticated
with check (user_id = (select auth.uid()) or public.is_platform_staff());

create policy service_provider_profiles_owner_update
on public.service_provider_profiles
for update to authenticated
using (user_id = (select auth.uid()) or public.is_platform_staff())
with check (user_id = (select auth.uid()) or public.is_platform_staff());

create policy service_provider_profiles_staff_delete
on public.service_provider_profiles
for delete to authenticated
using (public.is_platform_staff());

grant select on public.service_provider_profiles to anon, authenticated;
grant insert, update on public.service_provider_profiles to authenticated;
grant all on public.service_provider_profiles to service_role;

insert into public.service_provider_profiles (
  user_id, display_name, headline, bio, avatar_url, location, verified, active, is_demo
)
select
  profile.user_id,
  coalesce(profile.full_name, 'Prestador musical'),
  case
    when profile.role = 'producer' then 'Produtor musical'
    when profile.role = 'instructor' then 'Instrutor e especialista musical'
    else 'Profissional da música'
  end,
  null::text,
  profile.avatar_url,
  null::text,
  profile.is_demo,
  true,
  profile.is_demo
from public.user_profiles profile
where profile.role in ('producer', 'instructor')
on conflict (user_id) do update
set display_name = excluded.display_name,
    headline = excluded.headline,
    avatar_url = excluded.avatar_url,
    verified = excluded.verified,
    active = excluded.active,
    is_demo = excluded.is_demo,
    updated_at = now();

commit;
