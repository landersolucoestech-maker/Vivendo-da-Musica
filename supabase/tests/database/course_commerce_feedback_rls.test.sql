begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

with effective_policies as (
  select policy.tablename, policy.cmd, effective_role.role_name
  from pg_policies as policy
  cross join (values ('anon'::name), ('authenticated'::name)) as effective_role(role_name)
  where policy.schemaname = 'public'
    and policy.tablename in (
      'course_orders', 'course_order_items', 'course_certificates',
      'course_reviews', 'lesson_comments'
    )
    and ('public' = any(policy.roles) or effective_role.role_name = any(policy.roles))
), duplicates as (
  select tablename, cmd, role_name
  from effective_policies
  group by tablename, cmd, role_name
  having count(*) > 1
)
select is((select count(*)::bigint from duplicates), 0::bigint,
  'course commerce and feedback policies are unique per role/action');

select is((
  select count(*)::bigint from pg_policies
  where schemaname='public' and tablename='course_reviews'
    and policyname='course_reviews_authenticated_insert'
    and with_check ilike '%enrollment.course_id = course_reviews.course_id%'
), 1::bigint, 'course reviews require enrollment in the reviewed course');

select is((
  select count(*)::bigint from pg_policies
  where schemaname='public' and tablename='course_reviews'
    and policyname='course_reviews_authenticated_insert'
    and with_check ilike '%enrollment.course_id = enrollment.course_id%'
), 0::bigint, 'course review policy contains no tautological course comparison');

select is((
  select count(*)::bigint from pg_trigger
  where tgrelid='public.course_reviews'::regclass
    and tgname='protect_course_review_client_update' and not tgisinternal
), 1::bigint, 'course review immutable-field trigger exists');

select is((
  select count(*)::bigint from pg_trigger
  where tgrelid='public.lesson_comments'::regclass
    and tgname='protect_lesson_comment_client_update' and not tgisinternal
), 1::bigint, 'lesson comment immutable-field trigger exists');

select is((
  select count(*)::bigint from pg_policies
  where schemaname='public' and tablename='lesson_comments'
    and policyname='lesson_comments_authenticated_insert'
    and with_check ilike '%enrollment.course_id = course.id%'
), 1::bigint, 'lesson comment inserts require course membership');

select is((
  select count(*)::bigint from pg_policies
  where schemaname='public' and tablename='lesson_comments'
    and policyname in ('dev_student_comments_insert','dev_student_comments_read','dev_student_comments_update','dev_student_comments_delete')
    and (coalesce(qual,'') || ' ' || coalesce(with_check,'')) ilike '%course.is_demo = true%'
), 4::bigint, 'all anonymous lesson comment policies require a demo course');

select is((
  select count(*)::bigint from pg_policies
  where schemaname='public' and tablename in ('course_orders','course_order_items') and cmd='ALL'
), 0::bigint, 'course commerce administrative policies do not use ALL');

select is((
  select count(*)::bigint from pg_policies
  where schemaname='public' and tablename='course_order_items'
    and policyname='course_order_items_authenticated_read'
    and qual ilike '%is_course_staff(course_id)%'
    and qual ilike '%course_order.user_id = ( SELECT auth.uid()%'
), 1::bigint, 'course order item reads preserve instructor and buyer access');

select is((
  select count(*)::bigint from pg_policies
  where schemaname='public' and tablename='course_certificates'
    and policyname='course_certificates_authenticated_read'
    and qual ilike '%user_id = ( SELECT auth.uid()%'
    and qual ilike '%is_course_staff(course_id)%'
), 1::bigint, 'certificate reads preserve student and course staff access');

select ok(
  not has_function_privilege('authenticated','app_private.protect_course_review_client_update()','EXECUTE'),
  'clients cannot invoke the review trigger function directly'
);

select ok(
  not has_function_privilege('anon','app_private.protect_lesson_comment_client_update()','EXECUTE'),
  'anonymous clients cannot invoke the comment trigger function directly'
);

select * from finish();
rollback;
