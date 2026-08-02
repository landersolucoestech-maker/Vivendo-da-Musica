-- Reconcile the historical Portuguese course schema with the expanded
-- development catalog before its fixtures are inserted.

alter table public.course_modules
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.lessons
  add column if not exists slug text,
  add column if not exists thumbnail_url text,
  add column if not exists status text not null default 'draft',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.lessons
set slug = 'aula-' || left(replace(id::text, '-', ''), 16)
where slug is null or btrim(slug) = '';

create unique index if not exists lessons_module_slug_compat_unique
  on public.lessons(module_id, slug);

alter table public.lesson_progress
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.enrollments
  add column if not exists enrolled_at timestamptz not null default now();

do $$
declare
  source_udt text;
  constraint_row record;
begin
  select columns.udt_name
  into source_udt
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'enrollments'
    and column_name = 'source';

  if source_udt = 'enrollment_source' then
    alter type public.enrollment_source add value if not exists 'admin';
  elsif source_udt = 'text' then
    for constraint_row in
      select constraint_definition.constraint_name
      from information_schema.check_constraints constraint_definition
      join information_schema.constraint_column_usage constraint_usage
        on constraint_usage.constraint_schema = constraint_definition.constraint_schema
       and constraint_usage.constraint_name = constraint_definition.constraint_name
      where constraint_usage.table_schema = 'public'
        and constraint_usage.table_name = 'enrollments'
        and constraint_usage.column_name = 'source'
    loop
      execute format('alter table public.enrollments drop constraint %I', constraint_row.constraint_name);
    end loop;

    alter table public.enrollments
      add constraint enrollments_source_check
      check (source in ('manual','stripe','checkout','admin','import','development','payment'));
  end if;
end
$$;
