create table public.course_certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete restrict,
  enrollment_id uuid not null references public.enrollments(id) on delete restrict,
  certificate_code text not null unique,
  student_name_snapshot text not null,
  course_title_snapshot text not null,
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_certificates_user_course_key unique (user_id, course_id),
  constraint course_certificates_enrollment_key unique (enrollment_id),
  constraint course_certificates_code_format check (certificate_code ~ '^VDM-[A-F0-9]{16}$'),
  constraint course_certificates_student_name_length check (char_length(student_name_snapshot) between 1 and 200),
  constraint course_certificates_course_title_length check (char_length(course_title_snapshot) between 1 and 240),
  constraint course_certificates_revocation_consistency check (
    (revoked_at is null and revoked_reason is null)
    or (revoked_at is not null and nullif(btrim(revoked_reason), '') is not null)
  )
);

create index course_certificates_user_issued_idx
  on public.course_certificates (user_id, issued_at desc);

create index course_certificates_course_issued_idx
  on public.course_certificates (course_id, issued_at desc);

create trigger update_course_certificates_updated_at
  before update on public.course_certificates
  for each row execute function public.update_updated_at_column();

alter table public.course_certificates enable row level security;

create policy "Students can view their own certificates"
  on public.course_certificates
  for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

revoke all on table public.course_certificates from anon, authenticated;
grant select on table public.course_certificates to authenticated;

-- Certificate issuance is server-controlled. It runs only after a lesson is
-- completed and verifies the whole course again before inserting anything.
create or replace function public.issue_course_certificate_after_progress()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_course_id uuid;
  target_enrollment_id uuid;
  target_course_title text;
  target_student_name text;
begin
  if new.completed is not true then
    return new;
  end if;

  select cm.course_id
    into target_course_id
  from public.lessons l
  join public.course_modules cm on cm.id = l.module_id
  where l.id = new.lesson_id;

  if target_course_id is null then
    return new;
  end if;

  select e.id, c.title
    into target_enrollment_id, target_course_title
  from public.enrollments e
  join public.courses c on c.id = e.course_id
  where e.user_id = new.user_id
    and e.course_id = target_course_id
    and e.status = 'active';

  if target_enrollment_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.lessons l
    join public.course_modules cm on cm.id = l.module_id
    where cm.course_id = target_course_id
  ) or exists (
    select 1
    from public.lessons l
    join public.course_modules cm on cm.id = l.module_id
    where cm.course_id = target_course_id
      and not exists (
        select 1
        from public.lesson_progress lp
        where lp.lesson_id = l.id
          and lp.user_id = new.user_id
          and lp.completed is true
      )
  ) then
    return new;
  end if;

  select coalesce(nullif(btrim(up.full_name), ''), nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''), u.email, 'Aluno')
    into target_student_name
  from auth.users u
  left join public.user_profiles up on up.user_id = u.id
  where u.id = new.user_id;

  insert into public.course_certificates (
    user_id,
    course_id,
    enrollment_id,
    certificate_code,
    student_name_snapshot,
    course_title_snapshot
  ) values (
    new.user_id,
    target_course_id,
    target_enrollment_id,
    'VDM-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)),
    coalesce(target_student_name, 'Aluno'),
    target_course_title
  )
  on conflict (user_id, course_id) do nothing;

  return new;
end;
$$;

revoke all on function public.issue_course_certificate_after_progress() from public, anon, authenticated;

create trigger issue_course_certificate_on_lesson_completion
  after insert or update of completed on public.lesson_progress
  for each row
  when (new.completed is true)
  execute function public.issue_course_certificate_after_progress();

-- Issue certificates for courses that were already fully completed before
-- this migration, using the same completion conditions as the trigger.
insert into public.course_certificates (
  user_id,
  course_id,
  enrollment_id,
  certificate_code,
  student_name_snapshot,
  course_title_snapshot
)
select
  e.user_id,
  e.course_id,
  e.id,
  'VDM-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)),
  coalesce(nullif(btrim(up.full_name), ''), nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''), u.email, 'Aluno'),
  c.title
from public.enrollments e
join public.courses c on c.id = e.course_id
join auth.users u on u.id = e.user_id
left join public.user_profiles up on up.user_id = e.user_id
where e.status = 'active'
  and exists (
    select 1
    from public.lessons l
    join public.course_modules cm on cm.id = l.module_id
    where cm.course_id = e.course_id
  )
  and not exists (
    select 1
    from public.lessons l
    join public.course_modules cm on cm.id = l.module_id
    where cm.course_id = e.course_id
      and not exists (
        select 1
        from public.lesson_progress lp
        where lp.lesson_id = l.id
          and lp.user_id = e.user_id
          and lp.completed is true
      )
  )
on conflict (user_id, course_id) do nothing;
