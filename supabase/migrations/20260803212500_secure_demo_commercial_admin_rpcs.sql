begin;

alter table public.commercial_parameters
  add column if not exists is_demo boolean not null default false;

update public.commercial_parameters
set is_demo = true
where key in (
  'financial.default_platform_commission_bps',
  'financial.payout_minimum_cents',
  'financial.payout_delay_days',
  'affiliate.default_commission_bps',
  'affiliate.attribution_window_days',
  'jobs.credit_validity_days',
  'jobs.post_validity_days',
  'payments.refund_window_days',
  'payments.reserve_bps'
);

create or replace function public.admin_publish_demo_commercial_parameter(
  target_parameter_id uuid,
  target_value jsonb,
  target_effective_from timestamptz default now()
)
returns public.commercial_parameter_versions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  parameter public.commercial_parameters;
  next_version integer;
  result public.commercial_parameter_versions;
begin
  select * into parameter
  from public.commercial_parameters
  where id = target_parameter_id
    and is_demo
    and status = 'active';

  if parameter.id is null then
    raise exception 'Parâmetro demonstrativo não encontrado.';
  end if;

  if target_value is null then
    raise exception 'Valor obrigatório.';
  end if;

  update public.commercial_parameter_versions
  set effective_until = target_effective_from,
      status = 'archived'
  where parameter_id = parameter.id
    and status = 'published'
    and effective_from < target_effective_from
    and (effective_until is null or effective_until > target_effective_from);

  select coalesce(max(version), 0) + 1
  into next_version
  from public.commercial_parameter_versions
  where parameter_id = parameter.id;

  insert into public.commercial_parameter_versions (
    parameter_id,
    version,
    value,
    status,
    effective_from,
    published_at
  ) values (
    parameter.id,
    next_version,
    target_value,
    'published',
    target_effective_from,
    now()
  )
  returning * into result;

  insert into public.admin_audit_logs (
    actor_name_snapshot,
    action,
    entity_type,
    entity_id,
    metadata,
    is_demo
  ) values (
    'Administrador de demonstração',
    'commercial_parameter_published',
    'commercial_parameter',
    parameter.id::text,
    jsonb_build_object('key', parameter.key, 'version', next_version),
    true
  );

  return result;
end;
$$;

grant execute on function public.admin_publish_demo_commercial_parameter(uuid, jsonb, timestamptz) to anon, authenticated;

create or replace function public.admin_update_demo_job_credit_pack(
  target_pack_id uuid,
  target_name text,
  target_description text,
  target_credit_quantity integer,
  target_price_cents integer,
  target_currency text,
  target_validity_days integer,
  target_active boolean,
  target_sort_order integer
)
returns public.job_credit_packs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result public.job_credit_packs;
begin
  if target_credit_quantity <= 0 or target_price_cents < 0 or target_validity_days <= 0 then
    raise exception 'Quantidade, preço ou validade inválidos.';
  end if;

  update public.job_credit_packs
  set name = trim(target_name),
      description = nullif(trim(coalesce(target_description, '')), ''),
      credit_quantity = target_credit_quantity,
      price_cents = target_price_cents,
      currency = upper(trim(target_currency)),
      validity_days = target_validity_days,
      active = target_active,
      sort_order = target_sort_order,
      updated_at = now()
  where id = target_pack_id
    and is_demo
  returning * into result;

  if result.id is null then
    raise exception 'Pacote demonstrativo não encontrado.';
  end if;

  return result;
end;
$$;

grant execute on function public.admin_update_demo_job_credit_pack(uuid, text, text, integer, integer, text, integer, boolean, integer) to anon, authenticated;

create or replace function public.admin_update_demo_beat_license_template(
  target_template_id uuid,
  target_name text,
  target_description text,
  target_price_cents integer,
  target_currency text,
  target_deliverables jsonb,
  target_usage_rights jsonb,
  target_max_copies integer,
  target_active boolean,
  target_sort_order integer
)
returns public.beat_license_templates
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result public.beat_license_templates;
begin
  if target_price_cents < 0 or (target_max_copies is not null and target_max_copies <= 0) then
    raise exception 'Preço ou limite inválido.';
  end if;

  update public.beat_license_templates
  set name = trim(target_name),
      description = nullif(trim(coalesce(target_description, '')), ''),
      price_cents = target_price_cents,
      currency = upper(trim(target_currency)),
      deliverables = coalesce(target_deliverables, '[]'::jsonb),
      usage_rights = coalesce(target_usage_rights, '[]'::jsonb),
      max_copies = target_max_copies,
      active = target_active,
      sort_order = target_sort_order,
      updated_at = now()
  where id = target_template_id
    and is_demo
  returning * into result;

  if result.id is null then
    raise exception 'Modelo demonstrativo de licença não encontrado.';
  end if;

  return result;
end;
$$;

grant execute on function public.admin_update_demo_beat_license_template(uuid, text, text, integer, text, jsonb, jsonb, integer, boolean, integer) to anon, authenticated;

commit;
