update public.user_profiles p
set role = 'producer'
where p.role = 'student'
  and exists (
    select 1 from public.beats b where b.producer_id = p.user_id
  );
