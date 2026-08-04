begin;

create or replace function app_private.publish_company_opportunity_with_credit(
  target_company_id uuid,
  target_kind text,
  target_title text,
  target_location text,
  target_engagement_type text,
  target_work_mode text,
  target_description text,
  target_requirements text[],
  target_benefits text[],
  target_salary_min_cents integer,
  target_salary_max_cents integer,
  target_currency text,
  target_application_deadline date
)
returns public.opportunities
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  company public.company_profiles;
  lot public.company_credit_lots;
  opportunity public.opportunities;
  event_id uuid;
  balance integer;
  post_validity_days integer;
  actor_id uuid;
begin
  select * into company
  from public.company_profiles
  where id = target_company_id;

  if company.id is null then
    raise exception 'Empresa não encontrada.';
  end if;

  if (select auth.uid()) is null then
    if not company.is_demo then
      raise exception 'Autenticação obrigatória.';
    end if;
  elsif not public.is_company_member(target_company_id) and not public.is_platform_staff() then
    raise exception 'Usuário sem permissão para publicar por esta empresa.';
  end if;

  if length(trim(coalesce(target_title, ''))) < 3
    or length(trim(coalesce(target_description, ''))) < 20
    or length(trim(coalesce(target_location, ''))) < 2
    or length(trim(coalesce(target_engagement_type, ''))) < 2 then
    raise exception 'Dados obrigatórios da oportunidade são inválidos.';
  end if;

  if target_salary_min_cents is not null and target_salary_min_cents < 0 then
    raise exception 'Valor mínimo inválido.';
  end if;
  if target_salary_max_cents is not null and target_salary_max_cents < 0 then
    raise exception 'Valor máximo inválido.';
  end if;
  if target_salary_min_cents is not null and target_salary_max_cents is not null
    and target_salary_max_cents < target_salary_min_cents then
    raise exception 'Faixa de valores inválida.';
  end if;

  update public.company_credit_lots
  set status = 'expired'
  where company_id = target_company_id
    and status = 'active'
    and expires_at <= now();

  select * into lot
  from public.company_credit_lots
  where company_id = target_company_id
    and status = 'active'
    and remaining_credits > 0
    and expires_at > now()
  order by expires_at asc, created_at asc
  for update skip locked
  limit 1;

  if lot.id is null then
    raise exception 'A empresa não possui créditos disponíveis para publicar a vaga.';
  end if;

  post_validity_days := coalesce(
    (public.resolve_commercial_parameter('jobs.post_validity_days')->>'value')::integer,
    1
  );
  actor_id := coalesce((select auth.uid()), company.owner_user_id);

  insert into public.opportunities (
    company_id,
    created_by,
    kind,
    title,
    organization_name,
    location,
    engagement_type,
    work_mode,
    status,
    description,
    requirements,
    benefits,
    salary_min_cents,
    salary_max_cents,
    currency,
    application_deadline,
    published_at,
    posting_expires_at,
    credit_lot_id,
    is_demo
  ) values (
    target_company_id,
    actor_id,
    target_kind::public.opportunity_kind,
    trim(target_title),
    company.display_name,
    trim(target_location),
    trim(target_engagement_type),
    target_work_mode,
    'open',
    trim(target_description),
    coalesce(target_requirements, '{}'::text[]),
    coalesce(target_benefits, '{}'::text[]),
    target_salary_min_cents,
    target_salary_max_cents,
    upper(coalesce(nullif(trim(target_currency), ''), 'BRL')),
    target_application_deadline,
    now(),
    now() + make_interval(days => greatest(post_validity_days, 1)),
    lot.id,
    company.is_demo
  )
  returning * into opportunity;

  update public.company_credit_lots
  set remaining_credits = remaining_credits - 1,
      status = case when remaining_credits - 1 = 0 then 'exhausted' else 'active' end
  where id = lot.id;

  select coalesce(sum(remaining_credits), 0)::integer
  into balance
  from public.company_credit_lots
  where company_id = target_company_id
    and status = 'active'
    and expires_at > now();

  insert into public.company_credit_events (
    company_id,
    lot_id,
    opportunity_id,
    event_type,
    quantity,
    balance_after,
    reference,
    created_by,
    metadata
  ) values (
    target_company_id,
    lot.id,
    opportunity.id,
    'consume',
    -1,
    balance,
    'Publicação de oportunidade',
    actor_id,
    jsonb_build_object('validityDays', post_validity_days)
  )
  returning id into event_id;

  update public.opportunities
  set credit_event_id = event_id
  where id = opportunity.id
  returning * into opportunity;

  return opportunity;
end;
$$;

create or replace function public.publish_company_opportunity_with_credit(
  target_company_id uuid,
  target_kind text,
  target_title text,
  target_location text,
  target_engagement_type text,
  target_work_mode text,
  target_description text,
  target_requirements text[],
  target_benefits text[],
  target_salary_min_cents integer,
  target_salary_max_cents integer,
  target_currency text,
  target_application_deadline date
)
returns public.opportunities
language sql
security invoker
set search_path = public, app_private, pg_temp
as $$
  select app_private.publish_company_opportunity_with_credit(
    target_company_id,
    target_kind,
    target_title,
    target_location,
    target_engagement_type,
    target_work_mode,
    target_description,
    target_requirements,
    target_benefits,
    target_salary_min_cents,
    target_salary_max_cents,
    target_currency,
    target_application_deadline
  );
$$;

revoke all on function app_private.publish_company_opportunity_with_credit(
  uuid, text, text, text, text, text, text, text[], text[], integer, integer, text, date
) from public;
grant execute on function app_private.publish_company_opportunity_with_credit(
  uuid, text, text, text, text, text, text, text[], text[], integer, integer, text, date
) to anon, authenticated, service_role;

revoke all on function public.publish_company_opportunity_with_credit(
  uuid, text, text, text, text, text, text, text[], text[], integer, integer, text, date
) from public;
grant execute on function public.publish_company_opportunity_with_credit(
  uuid, text, text, text, text, text, text, text[], text[], integer, integer, text, date
) to anon, authenticated, service_role;

commit;
