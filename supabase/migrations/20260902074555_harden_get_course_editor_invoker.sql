do $migration$
begin
  if to_regprocedure('public.get_course_editor(uuid)') is null then
    return;
  end if;

  alter function public.get_course_editor(uuid) security invoker;
  revoke all on function public.get_course_editor(uuid) from public, anon;
  grant execute on function public.get_course_editor(uuid) to authenticated;
end
$migration$;
