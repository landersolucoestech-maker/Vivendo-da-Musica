-- Normalize only tables that still have overlapping effective permissive
-- policies after expanding PUBLIC roles and FOR ALL commands. The resulting
-- policy per role/action is the exact logical OR of every original path.

create temporary table rls_policy_snapshot on commit drop as
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public';

create temporary table rls_target_tables on commit drop as
with effective_policies as (
  select
    policy.tablename,
    policy.policyname,
    effective_role.role_name,
    expanded_command.command
  from rls_policy_snapshot as policy
  cross join (values ('anon'::name), ('authenticated'::name)) as effective_role(role_name)
  cross join lateral unnest(
    case
      when policy.cmd = 'ALL' then array['SELECT', 'INSERT', 'UPDATE', 'DELETE']::text[]
      else array[policy.cmd]::text[]
    end
  ) as expanded_command(command)
  where 'public' = any(policy.roles)
     or effective_role.role_name = any(policy.roles)
), duplicate_groups as (
  select tablename, role_name, command
  from effective_policies
  group by tablename, role_name, command
  having count(*) > 1
)
select distinct tablename
from duplicate_groups;

create temporary table rls_normalized_rules on commit drop as
select
  policy.tablename,
  effective_role.role_name,
  expanded_command.command,
  string_agg(
    distinct '(' || coalesce(policy.qual, 'true') || ')',
    ' OR '
    order by '(' || coalesce(policy.qual, 'true') || ')'
  ) filter (where expanded_command.command in ('SELECT', 'UPDATE', 'DELETE')) as using_expression,
  string_agg(
    distinct '(' || coalesce(policy.with_check, policy.qual, 'true') || ')',
    ' OR '
    order by '(' || coalesce(policy.with_check, policy.qual, 'true') || ')'
  ) filter (where expanded_command.command in ('INSERT', 'UPDATE')) as check_expression
from rls_policy_snapshot as policy
join rls_target_tables as target on target.tablename = policy.tablename
cross join (values ('anon'::name), ('authenticated'::name)) as effective_role(role_name)
cross join lateral unnest(
  case
    when policy.cmd = 'ALL' then array['SELECT', 'INSERT', 'UPDATE', 'DELETE']::text[]
    else array[policy.cmd]::text[]
  end
) as expanded_command(command)
where 'public' = any(policy.roles)
   or effective_role.role_name = any(policy.roles)
group by policy.tablename, effective_role.role_name, expanded_command.command;

do $$
declare
  original_policy record;
  normalized_rule record;
  normalized_name text;
begin
  for original_policy in
    select distinct snapshot.tablename, snapshot.policyname
    from rls_policy_snapshot as snapshot
    join rls_target_tables as target on target.tablename = snapshot.tablename
    order by snapshot.tablename, snapshot.policyname
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      original_policy.policyname,
      original_policy.tablename
    );
  end loop;

  for normalized_rule in
    select *
    from rls_normalized_rules
    order by tablename, role_name, command
  loop
    normalized_name := left(
      'normalized_' || normalized_rule.tablename || '_' || normalized_rule.role_name || '_' || lower(normalized_rule.command),
      63
    );

    case normalized_rule.command
      when 'SELECT' then
        execute format(
          'create policy %I on public.%I for select to %I using (%s)',
          normalized_name,
          normalized_rule.tablename,
          normalized_rule.role_name,
          normalized_rule.using_expression
        );
      when 'INSERT' then
        execute format(
          'create policy %I on public.%I for insert to %I with check (%s)',
          normalized_name,
          normalized_rule.tablename,
          normalized_rule.role_name,
          normalized_rule.check_expression
        );
      when 'UPDATE' then
        execute format(
          'create policy %I on public.%I for update to %I using (%s) with check (%s)',
          normalized_name,
          normalized_rule.tablename,
          normalized_rule.role_name,
          normalized_rule.using_expression,
          normalized_rule.check_expression
        );
      when 'DELETE' then
        execute format(
          'create policy %I on public.%I for delete to %I using (%s)',
          normalized_name,
          normalized_rule.tablename,
          normalized_rule.role_name,
          normalized_rule.using_expression
        );
      else
        raise exception 'Unsupported RLS command: %', normalized_rule.command;
    end case;
  end loop;
end;
$$;
