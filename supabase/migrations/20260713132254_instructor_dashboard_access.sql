create index if not exists course_order_items_course_id_idx
  on public.course_order_items (course_id);

create policy "Instructors view sales for their courses"
  on public.course_order_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.courses c
      where c.id = course_order_items.course_id
        and c.instructor_id = (select auth.uid())
    )
  );

grant select on table public.course_order_items to authenticated;
