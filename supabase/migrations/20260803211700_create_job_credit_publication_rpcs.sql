begin;

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
    target_kind,
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

grant execute on function public.publish_company_opportunity_with_credit(uuid, text, text, text, text, text, text, text[], text[], integer, integer, text, date) to anon, authenticated;

create or replace function public.renew_company_opportunity_with_credit(target_opportunity_id uuid)
returns public.opportunities
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  opportunity public.opportunities;
  company public.company_profiles;
  lot public.company_credit_lots;
  event_id uuid;
  balance integer;
  post_validity_days integer;
  actor_id uuid;
begin
  select * into opportunity
  from public.opportunities
  where id = target_opportunity_id
  for update;

  if opportunity.id is null or opportunity.company_id is null then
    raise exception 'Oportunidade empresarial não encontrada.';
  end if;

  select * into company
  from public.company_profiles
  where id = opportunity.company_id;

  if (select auth.uid()) is null then
    if not company.is_demo then
      raise exception 'Autenticação obrigatória.';
    end if;
  elsif not public.is_company_member(company.id) and not public.is_platform_staff() then
    raise exception 'Usuário sem permissão para renovar esta oportunidade.';
  end if;

  update public.company_credit_lots
  set status = 'expired'
  where company_id = company.id
    and status = 'active'
    and expires_at <= now();

  select * into lot
  from public.company_credit_lots
  where company_id = company.id
    and status = 'active'
    and remaining_credits > 0
    and expires_at > now()
  order by expires_at asc, created_at asc
  for update skip locked
  limit 1;

  if lot.id is null then
    raise exception 'A empresa não possui créditos disponíveis para renovar a vaga.';
  end if;

  post_validity_days := coalesce(
    (public.resolve_commercial_parameter('jobs.post_validity_days')->>'value')::integer,
    1
  );
  actor_id := coalesce((select auth.uid()), company.owner_user_id);

  update public.company_credit_lots
  set remaining_credits = remaining_credits - 1,
      status = case when remaining_credits - 1 = 0 then 'exhausted' else 'active' end
  where id = lot.id;

  select coalesce(sum(remaining_credits), 0)::integer
  into balance
  from public.company_credit_lots
  where company_id = company.id
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
    company.id,
    lot.id,
    opportunity.id,
    'consume',
    -1,
    balance,
    'Renovação de oportunidade',
    actor_id,
    jsonb_build_object('validityDays', post_validity_days)
  )
  returning id into event_id;

  update public.opportunities
  set status = 'open',
      published_at = now(),
      posting_expires_at = now() + make_interval(days => greatest(post_validity_days, 1)),
      credit_lot_id = lot.id,
      credit_event_id = event_id,
      renewal_count = renewal_count + 1,
      updated_at = now()
  where id = opportunity.id
  returning * into opportunity;

  return opportunity;
end;
$$;

grant execute on function public.renew_company_opportunity_with_credit(uuid) to anon, authenticated;

insert into public.job_credit_packs (
  code,
  name,
  description,
  credit_quantity,
  price_cents,
  currency,
  validity_days,
  active,
  sort_order,
  is_demo
) values
  ('DEV_JOB_1', '1 publicação', 'Pacote demonstrativo editável pelo Portal do Administrador.', 1, 1990, 'BRL', 180, true, 10, true),
  ('DEV_JOB_5', '5 publicações', 'Pacote demonstrativo editável pelo Portal do Administrador.', 5, 7990, 'BRL', 180, true, 20, true),
  ('DEV_JOB_10', '10 publicações', 'Pacote demonstrativo editável pelo Portal do Administrador.', 10, 13990, 'BRL', 180, true, 30, true),
  ('DEV_JOB_25', '25 publicações', 'Pacote demonstrativo editável pelo Portal do Administrador.', 25, 29990, 'BRL', 180, true, 40, true)
on conflict (code) do update
set name = excluded.name,
    description = excluded.description,
    credit_quantity = excluded.credit_quantity,
    price_cents = excluded.price_cents,
    currency = excluded.currency,
    validity_days = excluded.validity_days,
    active = excluded.active,
    sort_order = excluded.sort_order,
    is_demo = true,
    updated_at = now();

insert into public.company_credit_lots (
  company_id,
  pack_id,
  purchased_credits,
  remaining_credits,
  expires_at,
  status,
  is_demo
)
select
  company.id,
  pack.id,
  pack.credit_quantity,
  pack.credit_quantity,
  now() + make_interval(days => pack.validity_days),
  'active',
  true
from public.company_profiles company
cross join lateral (
  select *
  from public.job_credit_packs
  where code = 'DEV_JOB_25'
  limit 1
) pack
where company.is_demo
  and not exists (
    select 1
    from public.company_credit_lots lot
    where lot.company_id = company.id
      and lot.is_demo
      and lot.status in ('active', 'exhausted')
  );

insert into public.company_credit_events (
  company_id,
  lot_id,
  event_type,
  quantity,
  balance_after,
  reference,
  metadata
)
select
  lot.company_id,
  lot.id,
  'purchase',
  lot.purchased_credits,
  lot.remaining_credits,
  'Créditos demonstrativos iniciais',
  jsonb_build_object('demo', true)
from public.company_credit_lots lot
where lot.is_demo
  and not exists (
    select 1
    from public.company_credit_events evt
    where evt.lot_id = lot.id
      and evt.event_type = 'purchase'
  );

commit;