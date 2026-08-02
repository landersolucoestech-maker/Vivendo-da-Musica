alter table public.course_order_items
  add column if not exists paid_at timestamptz;

create table if not exists public.course_reviews (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text not null check (char_length(btrim(comment)) between 3 and 3000),
  status text not null default 'published' check (status in ('published','hidden')),
  instructor_response text,
  responded_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(course_id,user_id)
);

alter table public.course_reviews
  add column if not exists is_demo boolean not null default false;

create index if not exists course_reviews_course_created_idx on public.course_reviews(course_id,created_at desc);
create index if not exists course_reviews_user_id_idx on public.course_reviews(user_id);

alter table public.course_reviews enable row level security;

drop policy if exists course_reviews_demo_select on public.course_reviews;
create policy course_reviews_demo_select on public.course_reviews
for select to anon
using (is_demo = true);

drop policy if exists course_reviews_demo_update on public.course_reviews;
create policy course_reviews_demo_update on public.course_reviews
for update to anon
using (
  is_demo = true
  and exists (
    select 1 from public.courses course
    where course.id = course_id
      and course.instructor_id = 'c3942032-967a-4cde-b00c-22446584e699'::uuid
  )
)
with check (is_demo = true);

drop policy if exists course_reviews_authenticated_select on public.course_reviews;
create policy course_reviews_authenticated_select on public.course_reviews
for select to authenticated
using (
  status = 'published'
  or user_id = (select auth.uid())
  or exists (
    select 1 from public.courses course
    where course.id = course_id
      and course.instructor_id = (select auth.uid())
  )
  or public.is_platform_staff()
);

drop policy if exists course_reviews_authenticated_insert on public.course_reviews;
create policy course_reviews_authenticated_insert on public.course_reviews
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.enrollments enrollment
    where enrollment.user_id = (select auth.uid())
      and enrollment.course_id = course_id
      and enrollment.status = 'active'
  )
);

drop policy if exists course_reviews_authenticated_update on public.course_reviews;
create policy course_reviews_authenticated_update on public.course_reviews
for update to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.courses course
    where course.id = course_id
      and course.instructor_id = (select auth.uid())
  )
  or public.is_platform_staff()
)
with check (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.courses course
    where course.id = course_id
      and course.instructor_id = (select auth.uid())
  )
  or public.is_platform_staff()
);

grant select,update on public.course_reviews to anon;
grant select,insert,update,delete on public.course_reviews to authenticated;

insert into public.course_reviews (
  id,course_id,user_id,rating,comment,status,instructor_response,responded_at,is_demo,created_at,updated_at
) values
('cf100000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111',5,'O curso deixou meu processo de mixagem muito mais organizado e objetivo.','published','Excelente evolução. Continue comparando suas decisões com referências no mesmo volume.',now()-interval '8 days',true,now()-interval '10 days',now()-interval '8 days'),
('cf100000-0000-4000-8000-000000000002','d2000000-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111',4,'Os exercícios de letra e melodia ajudaram a simplificar meus refrões.','published','Muito bom. A clareza da ideia central costuma fortalecer bastante o refrão.',now()-interval '5 days',true,now()-interval '7 days',now()-interval '5 days'),
('cf100000-0000-4000-8000-000000000003','d2000000-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111111',5,'Consegui montar um calendário realista para o meu próximo lançamento.','published',null,null,true,now()-interval '4 days',now()-interval '4 days'),
('cf100000-0000-4000-8000-000000000004','d2000000-0000-4000-8000-000000000004','11111111-1111-4111-8111-111111111111',5,'A parte de groove e 808 foi direta ao ponto e muito prática.','published',null,null,true,now()-interval '2 days',now()-interval '2 days'),
('cf100000-0000-4000-8000-000000000005','d2000000-0000-4000-8000-000000000005','11111111-1111-4111-8111-111111111111',4,'Agora entendo melhor a diferença entre obra, fonograma e licenciamento de beat.','hidden',null,null,true,now()-interval '1 day',now()-interval '1 day')
on conflict (course_id,user_id) do update set
  rating=excluded.rating,comment=excluded.comment,status=excluded.status,
  instructor_response=excluded.instructor_response,responded_at=excluded.responded_at,
  is_demo=true,updated_at=excluded.updated_at;

update public.course_order_items item
set paid_at = coalesce(item.paid_at, course_order.paid_at)
from public.course_orders course_order
where course_order.id = item.order_id
  and course_order.status = 'paid'
  and course_order.paid_at is not null;
