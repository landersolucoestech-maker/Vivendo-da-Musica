create policy "Instructors create own courses"
  on public.courses for insert to authenticated
  with check (
    public.is_admin()
    or (public.current_role() = 'instructor' and instructor_id = (select auth.uid()))
  );

create policy "Instructors update own courses"
  on public.courses for update to authenticated
  using (
    public.is_admin()
    or (public.current_role() = 'instructor' and instructor_id = (select auth.uid()))
  )
  with check (
    public.is_admin()
    or (public.current_role() = 'instructor' and instructor_id = (select auth.uid()))
  );

create policy "Instructors delete own courses"
  on public.courses for delete to authenticated
  using (
    public.is_admin()
    or (public.current_role() = 'instructor' and instructor_id = (select auth.uid()))
  );

create policy "Instructors create modules in own courses"
  on public.course_modules for insert to authenticated
  with check (
    public.is_admin() or (
      public.current_role() = 'instructor'
      and exists (
        select 1 from public.courses c
        where c.id = course_id and c.instructor_id = (select auth.uid())
      )
    )
  );

create policy "Instructors update modules in own courses"
  on public.course_modules for update to authenticated
  using (public.is_course_staff(course_id))
  with check (
    public.is_admin() or (
      public.current_role() = 'instructor'
      and exists (
        select 1 from public.courses c
        where c.id = course_id and c.instructor_id = (select auth.uid())
      )
    )
  );

create policy "Instructors delete modules in own courses"
  on public.course_modules for delete to authenticated
  using (
    public.is_admin() or (
      public.current_role() = 'instructor'
      and exists (
        select 1 from public.courses c
        where c.id = course_id and c.instructor_id = (select auth.uid())
      )
    )
  );

create policy "Instructors create lessons in own courses"
  on public.lessons for insert to authenticated
  with check (
    public.is_admin() or (
      public.current_role() = 'instructor'
      and exists (
        select 1 from public.course_modules cm
        join public.courses c on c.id = cm.course_id
        where cm.id = module_id and c.instructor_id = (select auth.uid())
      )
    )
  );

create policy "Instructors update lessons in own courses"
  on public.lessons for update to authenticated
  using (
    public.is_admin() or exists (
      select 1 from public.course_modules cm
      join public.courses c on c.id = cm.course_id
      where cm.id = module_id
        and public.current_role() = 'instructor'
        and c.instructor_id = (select auth.uid())
    )
  )
  with check (
    public.is_admin() or exists (
      select 1 from public.course_modules cm
      join public.courses c on c.id = cm.course_id
      where cm.id = module_id
        and public.current_role() = 'instructor'
        and c.instructor_id = (select auth.uid())
    )
  );

create policy "Instructors delete lessons in own courses"
  on public.lessons for delete to authenticated
  using (
    public.is_admin() or exists (
      select 1 from public.course_modules cm
      join public.courses c on c.id = cm.course_id
      where cm.id = module_id
        and public.current_role() = 'instructor'
        and c.instructor_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on table public.courses to authenticated;
grant select, insert, update, delete on table public.course_modules to authenticated;
grant select, insert, update, delete on table public.lessons to authenticated;
