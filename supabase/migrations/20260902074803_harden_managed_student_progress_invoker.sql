do $migration$
begin
  if to_regprocedure('public.get_managed_student_progress(uuid,uuid)') is null then
    return;
  end if;

  alter function public.get_managed_student_progress(uuid,uuid) security invoker;
  revoke all on function public.get_managed_student_progress(uuid,uuid) from public, anon;
  grant execute on function public.get_managed_student_progress(uuid,uuid) to authenticated;
end
$migration$;
