create index if not exists course_modules_course_id_order_index_idx
  on public.course_modules (course_id, order_index);

create index if not exists lessons_module_id_order_index_idx
  on public.lessons (module_id, order_index)
  where module_id is not null;
