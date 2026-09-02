create or replace function public.get_managed_student_progress(p_course_id uuid, p_student_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $function$
declare
  v_enrollment public.enrollments;
begin
  if auth.uid() is null or not (
    exists(
      select 1 from public.user_profiles up
      where up.user_id = auth.uid()
        and up.role::text in ('admin','super_admin')
    )
    or exists(
      select 1 from public.courses c
      where c.id = p_course_id
        and c.instructor_id = auth.uid()
    )
  ) then
    raise exception 'course staff role required' using errcode='42501';
  end if;

  select * into v_enrollment
  from public.enrollments
  where course_id = p_course_id
    and user_id = p_student_id
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'enrollment not found' using errcode='P0002';
  end if;

  return jsonb_build_object(
    'enrollmentId', v_enrollment.id,
    'studentId', p_student_id,
    'status', v_enrollment.status,
    'lessons', coalesce((
      select jsonb_agg(jsonb_build_object(
        'lessonId', l.id,
        'title', l.title,
        'completed', coalesce(lp.completed,false),
        'progressPercentage', coalesce(lp.progress_percentage,0),
        'watchedSeconds', coalesce(lp.watched_seconds,0)
      ) order by m.order_index,l.order_index)
      from public.course_modules m
      join public.lessons l on l.module_id=m.id
      left join public.lesson_progress lp on lp.lesson_id=l.id and lp.user_id=p_student_id
      where m.course_id=p_course_id
    ),'[]'::jsonb),
    'activities', coalesce((
      select jsonb_agg(jsonb_build_object(
        'activityId', a.id,
        'title', a.title,
        'required', a.is_required,
        'submissionStatus', s.status,
        'submittedAt', s.submitted_at,
        'evaluatedAt', s.evaluated_at,
        'feedback', s.feedback
      ) order by a.position)
      from public.course_activities a
      left join public.activity_submissions s on s.activity_id=a.id and s.enrollment_id=v_enrollment.id
      where a.course_id=p_course_id
    ),'[]'::jsonb)
  );
end
$function$;

revoke all on function public.get_managed_student_progress(uuid,uuid) from public, anon;
grant execute on function public.get_managed_student_progress(uuid,uuid) to authenticated;
