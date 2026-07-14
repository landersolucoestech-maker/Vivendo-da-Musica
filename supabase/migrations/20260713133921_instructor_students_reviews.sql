create table public.course_reviews (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text not null check (char_length(btrim(comment)) between 3 and 2000),
  status text not null default 'published' check (status in ('published', 'hidden')),
  instructor_response text check (instructor_response is null or char_length(btrim(instructor_response)) between 1 and 2000),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_reviews_course_user_key unique (course_id, user_id)
);

create index course_reviews_course_status_created_idx
  on public.course_reviews (course_id, status, created_at desc);

create index enrollments_course_status_created_idx
  on public.enrollments (course_id, status, created_at desc);

alter table public.course_reviews enable row level security;

create policy "Enrolled students create own course reviews"
  on public.course_reviews for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.enrollments e
      where e.course_id = course_reviews.course_id
        and e.user_id = (select auth.uid())
        and e.status = 'active'
    )
  );

create policy "Users view own and published course reviews"
  on public.course_reviews for select
  to authenticated
  using (status = 'published' or user_id = (select auth.uid()));

create policy "Course staff view course reviews"
  on public.course_reviews for select
  to authenticated
  using (public.is_course_staff(course_id));

create policy "Students update own course reviews"
  on public.course_reviews for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and status = 'published'
    and instructor_response is null
    and responded_at is null
  );

create policy "Students delete own course reviews"
  on public.course_reviews for delete
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Course staff moderate course reviews"
  on public.course_reviews for update
  to authenticated
  using (public.is_course_staff(course_id))
  with check (public.is_course_staff(course_id));

create trigger update_course_reviews_updated_at
  before update on public.course_reviews
  for each row execute function public.update_updated_at_column();

grant select, insert, update, delete on public.course_reviews to authenticated;
