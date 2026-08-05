-- Consolidate course commerce, certificate, review and lesson-comment RLS.
-- Fix cross-course enrollment validation and prevent authors from mutating
-- moderation/identity fields through broad permissive policies.

create or replace function app_private.protect_course_review_client_update()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
declare
  caller_id uuid := (select auth.uid());
  caller_is_course_staff boolean := false;
begin
  if current_user in ('anon', 'authenticated') then
    if new.id is distinct from old.id
      or new.course_id is distinct from old.course_id
      or new.user_id is distinct from old.user_id
      or new.is_demo is distinct from old.is_demo
      or new.created_at is distinct from old.created_at then
      raise exception 'Identidade da avaliação não pode ser alterada.';
    end if;
  end if;

  if current_user = 'authenticated' and caller_id = old.user_id then
    caller_is_course_staff := public.is_course_staff(old.course_id);
    if not caller_is_course_staff then
      if new.status is distinct from old.status
        or new.instructor_response is distinct from old.instructor_response
        or new.responded_at is distinct from old.responded_at then
        raise exception 'O aluno não pode alterar campos de moderação da avaliação.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function app_private.protect_course_review_client_update() from public, anon, authenticated;

drop trigger if exists protect_course_review_client_update on public.course_reviews;
create trigger protect_course_review_client_update
before update on public.course_reviews
for each row execute function app_private.protect_course_review_client_update();

create or replace function app_private.protect_lesson_comment_client_update()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if new.id is distinct from old.id
      or new.lesson_id is distinct from old.lesson_id
      or new.author_id is distinct from old.author_id
      or new.created_at is distinct from old.created_at then
      raise exception 'Identidade do comentário não pode ser alterada.';
    end if;
  end if;

  if current_user = 'authenticated'
    and (select auth.uid()) = old.author_id
    and new.status is distinct from old.status then
    raise exception 'O autor não pode alterar o status de moderação do comentário.';
  end if;

  return new;
end;
$$;

revoke all on function app_private.protect_lesson_comment_client_update() from public, anon, authenticated;

drop trigger if exists protect_lesson_comment_client_update on public.lesson_comments;
create trigger protect_lesson_comment_client_update
before update on public.lesson_comments
for each row execute function app_private.protect_lesson_comment_client_update();

-- Certificates.
drop policy if exists "Course staff view course certificates" on public.course_certificates;
drop policy if exists "Students can view their own certificates" on public.course_certificates;
create policy course_certificates_authenticated_read
on public.course_certificates
for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.is_course_staff(course_id)
);

-- Course orders: one read policy plus explicit staff mutation policies.
drop policy if exists "Admins can manage course orders" on public.course_orders;
drop policy if exists "Admins can view course orders" on public.course_orders;
drop policy if exists "Users can view their own course orders" on public.course_orders;
drop policy if exists course_orders_owner_read on public.course_orders;

create policy course_orders_authenticated_read
on public.course_orders
for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.is_platform_staff()
);

create policy course_orders_staff_insert
on public.course_orders
for insert
to authenticated
with check (public.is_platform_staff());

create policy course_orders_staff_update
on public.course_orders
for update
to authenticated
using (public.is_platform_staff())
with check (public.is_platform_staff());

create policy course_orders_staff_delete
on public.course_orders
for delete
to authenticated
using (public.is_platform_staff());

-- Course order items.
drop policy if exists "Admins can manage course order items" on public.course_order_items;
drop policy if exists "Admins can view course order items" on public.course_order_items;
drop policy if exists "Instructors view sales for their courses" on public.course_order_items;
drop policy if exists "Users can view their own course order items" on public.course_order_items;
drop policy if exists course_order_items_owner_read on public.course_order_items;

create policy course_order_items_authenticated_read
on public.course_order_items
for select
to authenticated
using (
  public.is_platform_staff()
  or public.is_course_staff(course_id)
  or exists (
    select 1
    from public.course_orders as course_order
    where course_order.id = course_order_items.order_id
      and course_order.user_id = (select auth.uid())
  )
);

create policy course_order_items_staff_insert
on public.course_order_items
for insert
to authenticated
with check (public.is_platform_staff());

create policy course_order_items_staff_update
on public.course_order_items
for update
to authenticated
using (public.is_platform_staff())
with check (public.is_platform_staff());

create policy course_order_items_staff_delete
on public.course_order_items
for delete
to authenticated
using (public.is_platform_staff());

-- Course reviews.
drop policy if exists "Enrolled students create own course reviews" on public.course_reviews;
drop policy if exists course_reviews_authenticated_insert on public.course_reviews;
create policy course_reviews_authenticated_insert
on public.course_reviews
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.enrollments as enrollment
    where enrollment.course_id = course_reviews.course_id
      and enrollment.user_id = (select auth.uid())
      and enrollment.status = 'active'
  )
);

drop policy if exists "Course staff view course reviews" on public.course_reviews;
drop policy if exists "Users view own and published course reviews" on public.course_reviews;
drop policy if exists course_reviews_authenticated_select on public.course_reviews;
create policy course_reviews_authenticated_select
on public.course_reviews
for select
to authenticated
using (
  status = 'published'
  or user_id = (select auth.uid())
  or public.is_course_staff(course_id)
);

drop policy if exists "Course staff moderate course reviews" on public.course_reviews;
drop policy if exists "Students update own course reviews" on public.course_reviews;
drop policy if exists course_reviews_authenticated_update on public.course_reviews;
create policy course_reviews_authenticated_update
on public.course_reviews
for update
to authenticated
using (
  user_id = (select auth.uid())
  or public.is_course_staff(course_id)
)
with check (
  user_id = (select auth.uid())
  or public.is_course_staff(course_id)
);

-- Lesson comments.
drop policy if exists "Course members create lesson comments" on public.lesson_comments;
drop policy if exists lesson_comments_owner_insert on public.lesson_comments;
create policy lesson_comments_authenticated_insert
on public.lesson_comments
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and exists (
    select 1
    from public.lessons as lesson
    join public.course_modules as module on module.id = lesson.module_id
    join public.courses as course on course.id = module.course_id
    where lesson.id = lesson_comments.lesson_id
      and (
        course.instructor_id = (select auth.uid())
        or public.is_platform_staff()
        or exists (
          select 1
          from public.enrollments as enrollment
          where enrollment.course_id = course.id
            and enrollment.user_id = (select auth.uid())
            and enrollment.status = 'active'
        )
      )
  )
);

drop policy if exists "Course members read lesson comments" on public.lesson_comments;
drop policy if exists lesson_comments_authenticated_read on public.lesson_comments;
create policy lesson_comments_authenticated_read
on public.lesson_comments
for select
to authenticated
using (
  status = 'published'
  or author_id = (select auth.uid())
  or exists (
    select 1
    from public.lessons as lesson
    join public.course_modules as module on module.id = lesson.module_id
    where lesson.id = lesson_comments.lesson_id
      and (
        public.is_course_staff(module.course_id)
        or public.is_enrolled(module.course_id)
      )
  )
);

drop policy if exists "Authors update own lesson comments" on public.lesson_comments;
drop policy if exists lesson_comments_owner_update on public.lesson_comments;
create policy lesson_comments_owner_update
on public.lesson_comments
for update
to authenticated
using (author_id = (select auth.uid()))
with check (author_id = (select auth.uid()));

drop policy if exists "Authors or staff delete lesson comments" on public.lesson_comments;
create policy lesson_comments_author_staff_delete
on public.lesson_comments
for delete
to authenticated
using (
  author_id = (select auth.uid())
  or public.is_platform_staff()
);

-- Anonymous lesson comments are restricted to demo students and demo courses.
drop policy if exists dev_student_comments_insert on public.lesson_comments;
drop policy if exists dev_student_comments_read on public.lesson_comments;
drop policy if exists dev_student_comments_update on public.lesson_comments;
drop policy if exists dev_student_comments_delete on public.lesson_comments;

create policy dev_student_comments_insert
on public.lesson_comments
for insert
to anon
with check (
  exists (
    select 1
    from public.user_profiles as profile
    where profile.user_id = lesson_comments.author_id
      and profile.role = 'student'
      and profile.is_demo = true
  )
  and exists (
    select 1
    from public.lessons as lesson
    join public.course_modules as module on module.id = lesson.module_id
    join public.courses as course on course.id = module.course_id
    where lesson.id = lesson_comments.lesson_id
      and course.is_demo = true
  )
);

create policy dev_student_comments_read
on public.lesson_comments
for select
to anon
using (
  exists (
    select 1
    from public.lessons as lesson
    join public.course_modules as module on module.id = lesson.module_id
    join public.courses as course on course.id = module.course_id
    where lesson.id = lesson_comments.lesson_id
      and course.is_demo = true
  )
);

create policy dev_student_comments_update
on public.lesson_comments
for update
to anon
using (
  exists (
    select 1
    from public.user_profiles as profile
    where profile.user_id = lesson_comments.author_id
      and profile.role = 'student'
      and profile.is_demo = true
  )
  and exists (
    select 1
    from public.lessons as lesson
    join public.course_modules as module on module.id = lesson.module_id
    join public.courses as course on course.id = module.course_id
    where lesson.id = lesson_comments.lesson_id
      and course.is_demo = true
  )
)
with check (
  exists (
    select 1
    from public.user_profiles as profile
    where profile.user_id = lesson_comments.author_id
      and profile.role = 'student'
      and profile.is_demo = true
  )
  and exists (
    select 1
    from public.lessons as lesson
    join public.course_modules as module on module.id = lesson.module_id
    join public.courses as course on course.id = module.course_id
    where lesson.id = lesson_comments.lesson_id
      and course.is_demo = true
  )
);

create policy dev_student_comments_delete
on public.lesson_comments
for delete
to anon
using (
  exists (
    select 1
    from public.user_profiles as profile
    where profile.user_id = lesson_comments.author_id
      and profile.role = 'student'
      and profile.is_demo = true
  )
  and exists (
    select 1
    from public.lessons as lesson
    join public.course_modules as module on module.id = lesson.module_id
    join public.courses as course on course.id = module.course_id
    where lesson.id = lesson_comments.lesson_id
      and course.is_demo = true
  )
);
