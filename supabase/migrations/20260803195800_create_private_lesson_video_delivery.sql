begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'lesson-videos',
  'lesson-videos',
  false,
  524288000,
  array['video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

update public.lessons
set video_url = null
where video_url ~* '^(https?:)?//';

alter table public.lessons
  drop constraint if exists lessons_video_url_private_path_check;

alter table public.lessons
  add constraint lessons_video_url_private_path_check
  check (
    video_url is null
    or video_url ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[^/]+$'
  );

drop policy if exists lesson_videos_authenticated_read on storage.objects;
create policy lesson_videos_authenticated_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'lesson-videos'
  and exists (
    select 1
    from public.lessons l
    join public.course_modules m on m.id = l.module_id
    join public.courses c on c.id = m.course_id
    where c.id = ((storage.foldername(objects.name))[1])::uuid
      and l.id = ((storage.foldername(objects.name))[2])::uuid
      and (
        c.instructor_id = (select auth.uid())
        or public.is_platform_staff()
        or exists (
          select 1
          from public.enrollments e
          where e.course_id = c.id
            and e.user_id = (select auth.uid())
            and e.status = 'active'
        )
      )
  )
);

drop policy if exists lesson_videos_authenticated_insert on storage.objects;
create policy lesson_videos_authenticated_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'lesson-videos'
  and exists (
    select 1
    from public.lessons l
    join public.course_modules m on m.id = l.module_id
    join public.courses c on c.id = m.course_id
    where c.id = ((storage.foldername(objects.name))[1])::uuid
      and l.id = ((storage.foldername(objects.name))[2])::uuid
      and (
        c.instructor_id = (select auth.uid())
        or public.is_platform_staff()
      )
  )
);

drop policy if exists lesson_videos_authenticated_update on storage.objects;
create policy lesson_videos_authenticated_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'lesson-videos'
  and exists (
    select 1
    from public.lessons l
    join public.course_modules m on m.id = l.module_id
    join public.courses c on c.id = m.course_id
    where c.id = ((storage.foldername(objects.name))[1])::uuid
      and l.id = ((storage.foldername(objects.name))[2])::uuid
      and (
        c.instructor_id = (select auth.uid())
        or public.is_platform_staff()
      )
  )
)
with check (
  bucket_id = 'lesson-videos'
  and exists (
    select 1
    from public.lessons l
    join public.course_modules m on m.id = l.module_id
    join public.courses c on c.id = m.course_id
    where c.id = ((storage.foldername(objects.name))[1])::uuid
      and l.id = ((storage.foldername(objects.name))[2])::uuid
      and (
        c.instructor_id = (select auth.uid())
        or public.is_platform_staff()
      )
  )
);

drop policy if exists lesson_videos_authenticated_delete on storage.objects;
create policy lesson_videos_authenticated_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'lesson-videos'
  and exists (
    select 1
    from public.lessons l
    join public.course_modules m on m.id = l.module_id
    join public.courses c on c.id = m.course_id
    where c.id = ((storage.foldername(objects.name))[1])::uuid
      and l.id = ((storage.foldername(objects.name))[2])::uuid
      and (
        c.instructor_id = (select auth.uid())
        or public.is_platform_staff()
      )
  )
);

-- Políticas estritamente limitadas aos dados sintéticos do ambiente DEV.
drop policy if exists lesson_videos_demo_read on storage.objects;
create policy lesson_videos_demo_read
on storage.objects
for select
to anon
using (
  bucket_id = 'lesson-videos'
  and exists (
    select 1
    from public.lessons l
    join public.course_modules m on m.id = l.module_id
    join public.courses c on c.id = m.course_id
    where c.id = ((storage.foldername(objects.name))[1])::uuid
      and l.id = ((storage.foldername(objects.name))[2])::uuid
      and c.is_demo = true
  )
);

drop policy if exists lesson_videos_demo_insert on storage.objects;
create policy lesson_videos_demo_insert
on storage.objects
for insert
to anon
with check (
  bucket_id = 'lesson-videos'
  and exists (
    select 1
    from public.lessons l
    join public.course_modules m on m.id = l.module_id
    join public.courses c on c.id = m.course_id
    where c.id = ((storage.foldername(objects.name))[1])::uuid
      and l.id = ((storage.foldername(objects.name))[2])::uuid
      and c.is_demo = true
  )
);

drop policy if exists lesson_videos_demo_update on storage.objects;
create policy lesson_videos_demo_update
on storage.objects
for update
to anon
using (
  bucket_id = 'lesson-videos'
  and exists (
    select 1
    from public.lessons l
    join public.course_modules m on m.id = l.module_id
    join public.courses c on c.id = m.course_id
    where c.id = ((storage.foldername(objects.name))[1])::uuid
      and l.id = ((storage.foldername(objects.name))[2])::uuid
      and c.is_demo = true
  )
)
with check (
  bucket_id = 'lesson-videos'
  and exists (
    select 1
    from public.lessons l
    join public.course_modules m on m.id = l.module_id
    join public.courses c on c.id = m.course_id
    where c.id = ((storage.foldername(objects.name))[1])::uuid
      and l.id = ((storage.foldername(objects.name))[2])::uuid
      and c.is_demo = true
  )
);

drop policy if exists lesson_videos_demo_delete on storage.objects;
create policy lesson_videos_demo_delete
on storage.objects
for delete
to anon
using (
  bucket_id = 'lesson-videos'
  and exists (
    select 1
    from public.lessons l
    join public.course_modules m on m.id = l.module_id
    join public.courses c on c.id = m.course_id
    where c.id = ((storage.foldername(objects.name))[1])::uuid
      and l.id = ((storage.foldername(objects.name))[2])::uuid
      and c.is_demo = true
  )
);

commit;
