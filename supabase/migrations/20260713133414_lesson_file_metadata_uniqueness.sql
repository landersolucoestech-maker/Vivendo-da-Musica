create unique index lesson_files_lesson_id_key
  on public.lesson_files (lesson_id)
  where lesson_id is not null;

grant select, insert, update, delete on table public.lesson_files to authenticated;
