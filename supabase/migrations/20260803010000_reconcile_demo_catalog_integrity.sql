-- Final reconciliation for the deterministic development catalog.
-- This migration intentionally runs after every current seed so a clean
-- `supabase db reset` produces the same coherent data already expected by
-- the hosted development preview.

update public.courses
set
  thumbnail_url = 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=85',
  updated_at = now()
where is_demo = true
  and status::text = 'published'
  and (thumbnail_url is null or btrim(thumbnail_url) = '');

with courses_without_modules as (
  select course.id
  from public.courses as course
  where course.is_demo = true
    and course.status::text = 'published'
    and not exists (
      select 1
      from public.course_modules as module
      where module.course_id = course.id
    )
)
insert into public.course_modules (
  id,
  course_id,
  title,
  description,
  order_index,
  created_at,
  updated_at
)
select
  md5('vdm-demo-integrity-module-' || course.id::text)::uuid,
  course.id,
  'Introdução ao curso',
  'Visão geral, objetivos e orientação inicial do conteúdo.',
  0,
  now(),
  now()
from courses_without_modules as course
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  updated_at = now();

with courses_without_published_lessons as (
  select course.id
  from public.courses as course
  where course.is_demo = true
    and course.status::text = 'published'
    and not exists (
      select 1
      from public.course_modules as module
      join public.lessons as lesson on lesson.module_id = module.id
      where module.course_id = course.id
        and lesson.status::text = 'published'
    )
),
target_modules as (
  select
    course.id as course_id,
    module.id as module_id,
    coalesce(
      (
        select max(existing_lesson.order_index) + 1
        from public.lessons as existing_lesson
        where existing_lesson.module_id = module.id
      ),
      0
    ) as next_order_index
  from courses_without_published_lessons as course
  join lateral (
    select candidate.id
    from public.course_modules as candidate
    where candidate.course_id = course.id
    order by candidate.order_index, candidate.created_at, candidate.id
    limit 1
  ) as module on true
)
insert into public.lessons (
  id,
  module_id,
  title,
  slug,
  description,
  video_url,
  duration_minutes,
  order_index,
  status,
  created_at,
  updated_at
)
select
  md5('vdm-demo-integrity-lesson-' || target.course_id::text)::uuid,
  target.module_id,
  'Boas-vindas e visão geral',
  'boas-vindas-' || left(replace(target.course_id::text, '-', ''), 12),
  'Apresentação do curso, objetivos de aprendizagem e próximos passos.',
  'https://player.vimeo.com/video/76979871',
  12,
  target.next_order_index,
  'published',
  now(),
  now()
from target_modules as target
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  video_url = excluded.video_url,
  duration_minutes = excluded.duration_minutes,
  status = excluded.status,
  updated_at = now();

with item_totals as (
  select
    item.order_id,
    sum(item.amount_cents)::bigint as amount_cents
  from public.beat_order_items as item
  where item.order_id is not null
  group by item.order_id
)
update public.beat_orders as orders
set
  amount_cents = totals.amount_cents,
  updated_at = now()
from item_totals as totals
where orders.id = totals.order_id
  and orders.is_demo = true
  and orders.amount_cents is distinct from totals.amount_cents;
