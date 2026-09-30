do $migration$
begin
  if (
    select count(*)
    from storage.buckets
    where id in ('lesson-projects', 'lesson-samples')
  ) <> 2 then
    raise exception 'Expected lesson project and sample buckets are missing.'
      using errcode = 'P0002';
  end if;

  update storage.buckets
  set public = false
  where id in ('lesson-projects', 'lesson-samples');
end
$migration$;
