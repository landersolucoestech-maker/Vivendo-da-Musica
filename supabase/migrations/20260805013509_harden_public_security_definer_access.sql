-- Harden privileged objects exposed through the public Data API schema.
--
-- Public views must execute with the caller's privileges so underlying RLS
-- remains effective. SECURITY DEFINER functions remain available to the
-- service_role, but are not directly callable by anon or authenticated users.

alter view public.published_courses_preview set (security_invoker = true);

do $$
declare
  target_function record;
begin
  for target_function in
    select
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as identity_arguments
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
  loop
    execute format(
      'revoke execute on function %I.%I(%s) from public, anon, authenticated',
      target_function.schema_name,
      target_function.function_name,
      target_function.identity_arguments
    );
  end loop;
end;
$$;
