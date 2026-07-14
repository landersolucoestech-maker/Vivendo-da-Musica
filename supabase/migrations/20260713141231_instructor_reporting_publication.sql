create policy "Course staff view course certificates"
  on public.course_certificates for select
  to authenticated
  using (public.is_course_staff(course_id));

create policy "Course staff view student progress"
  on public.lesson_progress for select
  to authenticated
  using (
    exists (
      select 1
      from public.lessons l
      join public.course_modules m on m.id = l.module_id
      where l.id = lesson_progress.lesson_id
        and public.is_course_staff(m.course_id)
    )
  );

create index if not exists course_certificates_course_issued_idx
  on public.course_certificates (course_id, issued_at desc);

create index if not exists lesson_progress_lesson_user_idx
  on public.lesson_progress (lesson_id, user_id)
  where lesson_id is not null;

create or replace function public.validate_course_publication()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status = 'published' and old.status is distinct from 'published' then
    if char_length(btrim(coalesce(new.description, ''))) < 20 then
      raise exception 'Course description must contain at least 20 characters before publication';
    end if;

    if not exists (
      select 1 from public.course_modules m where m.course_id = new.id
    ) then
      raise exception 'Course requires at least one module before publication';
    end if;

    if not exists (
      select 1
      from public.lessons l
      join public.course_modules m on m.id = l.module_id
      where m.course_id = new.id
    ) then
      raise exception 'Course requires at least one lesson before publication';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.validate_course_publication() from public;

create trigger validate_course_before_publication
  before update of status on public.courses
  for each row execute function public.validate_course_publication();
