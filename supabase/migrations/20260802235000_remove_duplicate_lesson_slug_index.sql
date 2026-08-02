-- The compatibility index is only required on historical databases that do
-- not already have the canonical unique index created by the curriculum
-- domain. Remove it only when both indexes exist.

do $$
begin
  if to_regclass('public.lessons_module_slug_unique') is not null
     and to_regclass('public.lessons_module_slug_compat_unique') is not null then
    drop index public.lessons_module_slug_compat_unique;
  end if;
end
$$;
