create or replace function public.set_course_first_published_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.status = 'published'::public.course_status and new.published_at is null then
    new.published_at := now();
  end if;

  if tg_op = 'UPDATE' and old.published_at is not null then
    new.published_at := old.published_at;
  end if;

  return new;
end;
$$;

revoke all on function public.set_course_first_published_at() from public, anon, authenticated;
grant execute on function public.set_course_first_published_at() to service_role;

drop trigger if exists courses_first_published_at on public.courses;
create trigger courses_first_published_at
before insert or update of status, published_at on public.courses
for each row
execute function public.set_course_first_published_at();
