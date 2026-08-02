-- Development-only synthetic identities used by the unauthenticated review mode.
-- This migration is intended for the isolated Supabase dev branch only.

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  course_id uuid not null references public.courses(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'revoked', 'completed')),
  source text not null default 'development' check (source in ('development', 'manual', 'payment')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create index if not exists enrollments_user_id_idx on public.enrollments(user_id);
create index if not exists enrollments_course_id_idx on public.enrollments(course_id);

alter table public.enrollments enable row level security;

drop policy if exists dev_full_access_enrollments on public.enrollments;
create policy dev_full_access_enrollments
on public.enrollments
for all
to anon, authenticated
using (true)
with check (true);

grant select, insert, update, delete on public.enrollments to anon, authenticated;

-- The remote development branch stores roles as text, while a full local rebuild
-- still reaches the historical public.user_role enum. Seed only role values accepted
-- by the active column type and only identities compatible with an auth.users FK.
do $$
declare
  role_udt_name text;
  profile_requires_auth_user boolean;
begin
  select columns.udt_name
  into role_udt_name
  from information_schema.columns as columns
  where columns.table_schema = 'public'
    and columns.table_name = 'user_profiles'
    and columns.column_name = 'role';

  select exists (
    select 1
    from pg_constraint as constraints
    join pg_class as source_table
      on source_table.oid = constraints.conrelid
    join pg_namespace as source_schema
      on source_schema.oid = source_table.relnamespace
    join pg_class as target_table
      on target_table.oid = constraints.confrelid
    join pg_namespace as target_schema
      on target_schema.oid = target_table.relnamespace
    where constraints.contype = 'f'
      and source_schema.nspname = 'public'
      and source_table.relname = 'user_profiles'
      and target_schema.nspname = 'auth'
      and target_table.relname = 'users'
  )
  into profile_requires_auth_user;

  if role_udt_name = 'user_role' then
    insert into public.user_profiles (user_id, full_name, role)
    select
      seed.user_id,
      seed.full_name,
      seed.role::public.user_role
    from (
      values
        ('11111111-1111-4111-8111-111111111111'::uuid, 'Aluno de Desenvolvimento', 'student'),
        ('22222222-2222-4222-8222-222222222222'::uuid, 'Produtor de Desenvolvimento', 'producer'),
        ('33333333-3333-4333-8333-333333333333'::uuid, 'Afiliado de Desenvolvimento', 'affiliate'),
        ('44444444-4444-4444-8444-444444444444'::uuid, 'Administrador de Desenvolvimento', 'admin')
    ) as seed(user_id, full_name, role)
    where exists (
      select 1
      from pg_type as enum_type
      join pg_namespace as enum_schema
        on enum_schema.oid = enum_type.typnamespace
      join pg_enum as enum_value
        on enum_value.enumtypid = enum_type.oid
      where enum_schema.nspname = 'public'
        and enum_type.typname = 'user_role'
        and enum_value.enumlabel = seed.role
    )
      and (
        not profile_requires_auth_user
        or exists (
          select 1
          from auth.users as auth_user
          where auth_user.id = seed.user_id
        )
      )
    on conflict (user_id) do update
    set full_name = excluded.full_name,
        role = excluded.role,
        updated_at = now();
  else
    insert into public.user_profiles (user_id, full_name, role)
    select
      seed.user_id,
      seed.full_name,
      seed.role
    from (
      values
        ('11111111-1111-4111-8111-111111111111'::uuid, 'Aluno de Desenvolvimento', 'student'),
        ('22222222-2222-4222-8222-222222222222'::uuid, 'Produtor de Desenvolvimento', 'producer'),
        ('33333333-3333-4333-8333-333333333333'::uuid, 'Afiliado de Desenvolvimento', 'affiliate'),
        ('44444444-4444-4444-8444-444444444444'::uuid, 'Administrador de Desenvolvimento', 'admin')
    ) as seed(user_id, full_name, role)
    where not profile_requires_auth_user
       or exists (
         select 1
         from auth.users as auth_user
         where auth_user.id = seed.user_id
       )
    on conflict (user_id) do update
    set full_name = excluded.full_name,
        role = excluded.role,
        updated_at = now();
  end if;
end
$$;

insert into public.enrollments (user_id, course_id, status, source)
select
  '11111111-1111-4111-8111-111111111111'::uuid,
  c.id,
  'active',
  case
    when pg_typeof(public.enrollments.source)::text = 'enrollment_source'
      then 'manual'
    else 'development'
  end
from public.courses c
where c.slug = 'producao-musical-do-zero-ao-profissional'
  and exists (
    select 1
    from public.user_profiles as profile
    where profile.user_id = '11111111-1111-4111-8111-111111111111'::uuid
  )
on conflict (user_id, course_id) do update
set status = excluded.status,
    source = excluded.source,
    updated_at = now();

update public.lesson_progress
set user_id = '11111111-1111-4111-8111-111111111111'::uuid,
    updated_at = now()
where user_id = 'c3942032-967a-4cde-b00c-22446584e699'::uuid
  and exists (
    select 1
    from public.user_profiles as profile
    where profile.user_id = '11111111-1111-4111-8111-111111111111'::uuid
  );
