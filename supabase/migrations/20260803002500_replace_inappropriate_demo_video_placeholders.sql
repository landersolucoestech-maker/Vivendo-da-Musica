-- Remove the unrelated YouTube placeholder from development lessons. Reuse
-- the neutral Vimeo demo source already used by the remaining synthetic
-- curriculum, and never touch non-demo course records.

update public.lessons as lesson
set video_url = 'https://player.vimeo.com/video/76979871',
    updated_at = now()
from public.course_modules as module,
     public.courses as course
where module.id = lesson.module_id
  and course.id = module.course_id
  and course.is_demo = true
  and lesson.video_url like '%dQw4w9WgXcQ%';
