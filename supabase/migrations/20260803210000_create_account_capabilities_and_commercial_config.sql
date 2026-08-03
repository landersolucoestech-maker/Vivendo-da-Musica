begin;

create table if not exists public.account_capabilities (
  user_id uuid not null references auth.users(id) on delete cascade,
  capability text not null,
  status text not null default 'active',
  is_default boolean not null default false,
  activated_at timestamptz,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, capability),
  constraint account_capabilities_capability_check check (
    capability in ('student', 'instructor', 'producer', 'affiliate', 'company', 'admin', 'super_admin')
  ),
  constraint account_capabilities_status_check check (
    status in ('pending', 'active', 'suspended', 'rejected')
  )
);

create index if not exists account_capabilities_user_status_idx
  on public.account_capabilities (user_id, status);

create unique index if not exists account_capabilities_one_default_idx
  on public.account_capabilities (user_id)
  where is_default and status = 'active';

drop trigger if exists set_account_capabilities_updated_at on public.account_capabilities;
create trigger set_account_capabilities_updated_at
before update on public.account_capabilities
for each row execute function public.set_updated_at();

alter table public.account_capabilities enable row level security;

drop policy if exists account_capabilities_select_own_or_staff on public.account_capabilities;
create policy account_capabilities_select_own_or_staff
on public.account_capabilities
for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.is_platform_staff()
);

drop policy if exists account_capabilities_staff_manage on public.account_capabilities;
create policy account_capabilities_staff_manage
on public.account_capabilities
for all
to authenticated
using (public.is_platform_staff())
with check (public.is_platform_staff());

grant select on public.account_capabilities to authenticated;

insert into public.account_capabilities (user_id, capability, status, is_default, activated_at)
select profile.user_id, 'student', 'active', profile.role = 'student', now()
from public.user_profiles profile
on conflict (user_id, capability) do update
set status = 'active',
    activated_at = coalesce(public.account_capabilities.activated_at, excluded.activated_at),
    is_default = public.account_capabilities.is_default or excluded.is_default;

insert into public.account_capabilities (user_id, capability, status, is_default, activated_at)
select profile.user_id, profile.role, 'active', true, now()
from public.user_profiles profile
where profile.role in ('student', 'instructor', 'producer', 'affiliate', 'company', 'admin', 'super_admin')
on conflict (user_id, capability) do update
set status = 'active',
    activated_at = coalesce(public.account_capabilities.activated_at, excluded.activated_at),
    is_default = true;

insert into public.account_capabilities (user_id, capability, status, activated_at)
select distinct member.user_id, 'company', 'active', now()
from public.company_members member
where member.status = 'active'
on conflict (user_id, capability) do update
set status = 'active',
    activated_at = coalesce(public.account_capabilities.activated_at, excluded.activated_at);

insert into public.account_capabilities (user_id, capability, status, activated_at)
select distinct affiliate.user_id, 'affiliate', 'active', now()
from public.affiliate_profiles affiliate
where affiliate.user_id is not null and affiliate.status = 'active'
on conflict (user_id, capability) do update
set status = 'active',
    activated_at = coalesce(public.account_capabilities.activated_at, excluded.activated_at);

create or replace function public.has_account_capability(target_capability text)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.account_capabilities capability
    where capability.user_id = (select auth.uid())
      and capability.capability = target_capability
      and capability.status = 'active'
  );
$$;

grant execute on function public.has_account_capability(text) to authenticated;

create or replace function public.current_account_capabilities()
returns text[]
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce(array_agg(capability.capability order by capability.capability), '{}'::text[])
  from public.account_capabilities capability
  where capability.user_id = (select auth.uid())
    and capability.status = 'active';
$$;

grant execute on function public.current_account_capabilities() to authenticated;

create or replace function public.is_platform_staff()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.account_capabilities capability
    where capability.user_id = (select auth.uid())
      and capability.capability in ('admin', 'super_admin')
      and capability.status = 'active'
  )
  or exists (
    select 1
    from public.user_profiles profile
    where profile.user_id = (select auth.uid())
      and profile.role in ('admin', 'super_admin')
  );
$$;

create or replace function public.request_account_capability(target_capability text)
returns public.account_capabilities
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  normalized_capability text := lower(trim(coalesce(target_capability, '')));
  result public.account_capabilities;
begin
  if (select auth.uid()) is null then
    raise exception 'Autenticação obrigatória.';
  end if;

  if normalized_capability not in ('student', 'instructor', 'producer', 'affiliate', 'company') then
    raise exception 'Capacidade inválida.';
  end if;

  insert into public.account_capabilities (
    user_id,
    capability,
    status,
    is_default,
    activated_at
  ) values (
    (select auth.uid()),
    normalized_capability,
    case when normalized_capability = 'student' then 'active' else 'pending' end,
    normalized_capability = 'student',
    case when normalized_capability = 'student' then now() else null end
  )
  on conflict (user_id, capability) do update
  set status = case
        when public.account_capabilities.status = 'active' then 'active'
        when normalized_capability = 'student' then 'active'
        else 'pending'
      end,
      requested_at = now(),
      activated_at = case
        when normalized_capability = 'student' then coalesce(public.account_capabilities.activated_at, now())
        else public.account_capabilities.activated_at
      end
  returning * into result;

  return result;
end;
$$;

grant execute on function public.request_account_capability(text) to authenticated;

create or replace function public.admin_set_account_capability(
  target_user_id uuid,
  target_capability text,
  target_status text,
  target_is_default boolean default false
)
returns public.account_capabilities
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  normalized_capability text := lower(trim(coalesce(target_capability, '')));
  normalized_status text := lower(trim(coalesce(target_status, '')));
  result public.account_capabilities;
begin
  if not public.is_platform_staff() then
    raise exception 'Acesso administrativo obrigatório.';
  end if;

  if normalized_capability not in ('student', 'instructor', 'producer', 'affiliate', 'company', 'admin', 'super_admin') then
    raise exception 'Capacidade inválida.';
  end if;

  if normalized_status not in ('pending', 'active', 'suspended', 'rejected') then
    raise exception 'Status inválido.';
  end if;

  if target_is_default and normalized_status <> 'active' then
    raise exception 'A capacidade padrão deve estar ativa.';
  end if;

  if target_is_default then
    update public.account_capabilities
    set is_default = false
    where user_id = target_user_id;
  end if;

  insert into public.account_capabilities (
    user_id,
    capability,
    status,
    is_default,
    activated_at,
    reviewed_at,
    reviewed_by
  ) values (
    target_user_id,
    normalized_capability,
    normalized_status,
    target_is_default,
    case when normalized_status = 'active' then now() else null end,
    now(),
    (select auth.uid())
  )
  on conflict (user_id, capability) do update
  set status = excluded.status,
      is_default = excluded.is_default,
      activated_at = case
        when excluded.status = 'active' then coalesce(public.account_capabilities.activated_at, now())
        else public.account_capabilities.activated_at
      end,
      reviewed_at = now(),
      reviewed_by = (select auth.uid())
  returning * into result;

  if target_is_default and normalized_status = 'active' then
    update public.user_profiles
    set role = normalized_capability
    where user_id = target_user_id;
  end if;

  return result;
end;
$$;

grant execute on function public.admin_set_account_capability(uuid, text, text, boolean) to authenticated;

create or replace function public.sync_profile_capabilities()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  insert into public.account_capabilities (user_id, capability, status, is_default, activated_at)
  values (new.user_id, 'student', 'active', new.role = 'student', now())
  on conflict (user_id, capability) do update
  set status = 'active',
      activated_at = coalesce(public.account_capabilities.activated_at, now()),
      is_default = case when new.role = 'student' then true else public.account_capabilities.is_default end;

  if new.role in ('student', 'instructor', 'producer', 'affiliate', 'company', 'admin', 'super_admin') then
    if new.role <> 'student' then
      update public.account_capabilities
      set is_default = false
      where user_id = new.user_id and is_default;
    end if;

    insert into public.account_capabilities (user_id, capability, status, is_default, activated_at)
    values (new.user_id, new.role, 'active', true, now())
    on conflict (user_id, capability) do update
    set status = 'active',
        is_default = true,
        activated_at = coalesce(public.account_capabilities.activated_at, now());
  end if;

  return new;
end;
$$;

drop trigger if exists sync_profile_capabilities_trigger on public.user_profiles;
create trigger sync_profile_capabilities_trigger
after insert or update of role on public.user_profiles
for each row execute function public.sync_profile_capabilities();

create or replace function public.sync_company_member_capability()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.status = 'active' then
    insert into public.account_capabilities (user_id, capability, status, activated_at)
    values (new.user_id, 'company', 'active', now())
    on conflict (user_id, capability) do update
    set status = 'active',
        activated_at = coalesce(public.account_capabilities.activated_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists sync_company_member_capability_trigger on public.company_members;
create trigger sync_company_member_capability_trigger
after insert or update of status on public.company_members
for each row execute function public.sync_company_member_capability();

create or replace function public.sync_affiliate_capability()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.user_id is not null and new.status = 'active' then
    insert into public.account_capabilities (user_id, capability, status, activated_at)
    values (new.user_id, 'affiliate', 'active', now())
    on conflict (user_id, capability) do update
    set status = 'active',
        activated_at = coalesce(public.account_capabilities.activated_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists sync_affiliate_capability_trigger on public.affiliate_profiles;
create trigger sync_affiliate_capability_trigger
after insert or update of status, user_id on public.affiliate_profiles
for each row execute function public.sync_affiliate_capability();

create table if not exists public.commercial_parameters (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  category text not null,
  label text not null,
  description text,
  value_type text not null,
  scope_type text not null default 'global',
  scope_id uuid,
  visibility text not null default 'authenticated',
  status text not null default 'active',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commercial_parameters_key_check check (key ~ '^[a-z0-9][a-z0-9._-]{2,119}$'),
  constraint commercial_parameters_value_type_check check (
    value_type in ('integer', 'decimal', 'money', 'percentage_bps', 'boolean', 'text', 'json')
  ),
  constraint commercial_parameters_scope_type_check check (
    scope_type in ('global', 'category', 'offer', 'company', 'user', 'resource')
  ),
  constraint commercial_parameters_visibility_check check (
    visibility in ('public', 'authenticated', 'staff')
  ),
  constraint commercial_parameters_status_check check (
    status in ('active', 'archived')
  )
);

create unique index if not exists commercial_parameters_scope_key_idx
on public.commercial_parameters (
  key,
  scope_type,
  coalesce(scope_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

create table if not exists public.commercial_parameter_versions (
  id uuid primary key default gen_random_uuid(),
  parameter_id uuid not null references public.commercial_parameters(id) on delete cascade,
  version integer not null,
  value jsonb not null,
  status text not null default 'draft',
  effective_from timestamptz not null default now(),
  effective_until timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  constraint commercial_parameter_versions_version_check check (version > 0),
  constraint commercial_parameter_versions_status_check check (
    status in ('draft', 'published', 'archived')
  ),
  constraint commercial_parameter_versions_period_check check (
    effective_until is null or effective_until > effective_from
  ),
  unique (parameter_id, version)
);

create index if not exists commercial_parameter_versions_runtime_idx
  on public.commercial_parameter_versions (parameter_id, status, effective_from desc, version desc);

drop trigger if exists set_commercial_parameters_updated_at on public.commercial_parameters;
create trigger set_commercial_parameters_updated_at
before update on public.commercial_parameters
for each row execute function public.set_updated_at();

alter table public.commercial_parameters enable row level security;
alter table public.commercial_parameter_versions enable row level security;

drop policy if exists commercial_parameters_public_read on public.commercial_parameters;
create policy commercial_parameters_public_read
on public.commercial_parameters
for select
to anon
using (status = 'active' and visibility = 'public');

drop policy if exists commercial_parameters_authenticated_read on public.commercial_parameters;
create policy commercial_parameters_authenticated_read
on public.commercial_parameters
for select
to authenticated
using (
  status = 'active'
  and (visibility in ('public', 'authenticated') or public.is_platform_staff())
);

drop policy if exists commercial_parameters_staff_manage on public.commercial_parameters;
create policy commercial_parameters_staff_manage
on public.commercial_parameters
for all
to authenticated
using (public.is_platform_staff())
with check (public.is_platform_staff());

drop policy if exists commercial_parameter_versions_public_read on public.commercial_parameter_versions;
create policy commercial_parameter_versions_public_read
on public.commercial_parameter_versions
for select
to anon
using (
  status = 'published'
  and effective_from <= now()
  and (effective_until is null or effective_until > now())
  and exists (
    select 1
    from public.commercial_parameters parameter
    where parameter.id = parameter_id
      and parameter.status = 'active'
      and parameter.visibility = 'public'
  )
);

drop policy if exists commercial_parameter_versions_authenticated_read on public.commercial_parameter_versions;
create policy commercial_parameter_versions_authenticated_read
on public.commercial_parameter_versions
for select
to authenticated
using (
  public.is_platform_staff()
  or (
    status = 'published'
    and effective_from <= now()
    and (effective_until is null or effective_until > now())
    and exists (
      select 1
      from public.commercial_parameters parameter
      where parameter.id = parameter_id
        and parameter.status = 'active'
        and parameter.visibility in ('public', 'authenticated')
    )
  )
);

drop policy if exists commercial_parameter_versions_staff_manage on public.commercial_parameter_versions;
create policy commercial_parameter_versions_staff_manage
on public.commercial_parameter_versions
for all
to authenticated
using (public.is_platform_staff())
with check (public.is_platform_staff());

grant select on public.commercial_parameters to anon, authenticated;
grant select on public.commercial_parameter_versions to anon, authenticated;

create or replace function public.resolve_commercial_parameter(
  target_key text,
  target_scope_type text default 'global',
  target_scope_id uuid default null,
  target_at timestamptz default now()
)
returns jsonb
language sql
stable
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'parameterId', parameter.id,
    'versionId', version.id,
    'key', parameter.key,
    'category', parameter.category,
    'label', parameter.label,
    'valueType', parameter.value_type,
    'scopeType', parameter.scope_type,
    'scopeId', parameter.scope_id,
    'value', version.value,
    'version', version.version,
    'effectiveFrom', version.effective_from,
    'effectiveUntil', version.effective_until
  )
  from public.commercial_parameters parameter
  join public.commercial_parameter_versions version
    on version.parameter_id = parameter.id
  where parameter.key = target_key
    and parameter.status = 'active'
    and version.status = 'published'
    and version.effective_from <= target_at
    and (version.effective_until is null or version.effective_until > target_at)
    and (
      (parameter.scope_type = target_scope_type and parameter.scope_id is not distinct from target_scope_id)
      or (parameter.scope_type = 'global' and parameter.scope_id is null)
    )
  order by
    case
      when parameter.scope_type = target_scope_type and parameter.scope_id is not distinct from target_scope_id then 0
      else 1
    end,
    version.effective_from desc,
    version.version desc
  limit 1;
$$;

grant execute on function public.resolve_commercial_parameter(text, text, uuid, timestamptz) to anon, authenticated;

create or replace function public.admin_publish_commercial_parameter(
  target_key text,
  target_category text,
  target_label text,
  target_description text,
  target_value_type text,
  target_value jsonb,
  target_scope_type text default 'global',
  target_scope_id uuid default null,
  target_visibility text default 'authenticated',
  target_effective_from timestamptz default now()
)
returns public.commercial_parameter_versions
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_parameter_id uuid;
  next_version integer;
  result public.commercial_parameter_versions;
  actor_name text;
begin
  if not public.is_platform_staff() then
    raise exception 'Acesso administrativo obrigatório.';
  end if;

  if target_value is null then
    raise exception 'Valor obrigatório.';
  end if;

  select parameter.id
  into v_parameter_id
  from public.commercial_parameters parameter
  where parameter.key = lower(trim(target_key))
    and parameter.scope_type = target_scope_type
    and parameter.scope_id is not distinct from target_scope_id
  limit 1;

  if v_parameter_id is null then
    insert into public.commercial_parameters (
      key,
      category,
      label,
      description,
      value_type,
      scope_type,
      scope_id,
      visibility,
      status,
      created_by
    ) values (
      lower(trim(target_key)),
      trim(target_category),
      trim(target_label),
      nullif(trim(coalesce(target_description, '')), ''),
      target_value_type,
      target_scope_type,
      target_scope_id,
      target_visibility,
      'active',
      (select auth.uid())
    )
    returning id into v_parameter_id;
  else
    update public.commercial_parameters
    set category = trim(target_category),
        label = trim(target_label),
        description = nullif(trim(coalesce(target_description, '')), ''),
        value_type = target_value_type,
        visibility = target_visibility,
        status = 'active'
    where id = v_parameter_id;
  end if;

  update public.commercial_parameter_versions
  set effective_until = target_effective_from,
      status = 'archived'
  where parameter_id = v_parameter_id
    and status = 'published'
    and effective_from < target_effective_from
    and (effective_until is null or effective_until > target_effective_from);

  select coalesce(max(version), 0) + 1
  into next_version
  from public.commercial_parameter_versions
  where parameter_id = v_parameter_id;

  insert into public.commercial_parameter_versions (
    parameter_id,
    version,
    value,
    status,
    effective_from,
    created_by,
    approved_by,
    published_at
  ) values (
    v_parameter_id,
    next_version,
    target_value,
    'published',
    target_effective_from,
    (select auth.uid()),
    (select auth.uid()),
    now()
  )
  returning * into result;

  select coalesce(profile.full_name, 'Administrador')
  into actor_name
  from public.user_profiles profile
  where profile.user_id = (select auth.uid());

  insert into public.admin_audit_logs (
    actor_id,
    actor_name_snapshot,
    action,
    entity_type,
    entity_id,
    metadata,
    is_demo
  ) values (
    (select auth.uid()),
    coalesce(actor_name, 'Administrador'),
    'commercial_parameter_published',
    'commercial_parameter',
    v_parameter_id::text,
    jsonb_build_object(
      'key', lower(trim(target_key)),
      'version', next_version,
      'scopeType', target_scope_type,
      'scopeId', target_scope_id,
      'effectiveFrom', target_effective_from
    ),
    false
  );

  return result;
end;
$$;

grant execute on function public.admin_publish_commercial_parameter(text, text, text, text, text, jsonb, text, uuid, text, timestamptz) to authenticated;

with seed as (
  select *
  from (
    values
      ('financial.default_platform_commission_bps', 'financeiro', 'Comissão padrão da plataforma', 'Percentual padrão retido pela plataforma, em pontos-base.', 'percentage_bps', 'authenticated', to_jsonb(coalesce((select default_commission_bps from public.platform_financial_settings where id = true), 0))),
      ('financial.payout_minimum_cents', 'financeiro', 'Valor mínimo de repasse', 'Valor mínimo permitido para solicitação de repasse.', 'money', 'authenticated', to_jsonb(coalesce((select payout_minimum_cents from public.platform_financial_settings where id = true), 0))),
      ('financial.payout_delay_days', 'financeiro', 'Prazo de liberação para repasse', 'Quantidade de dias entre o pagamento confirmado e a liberação do saldo.', 'integer', 'authenticated', to_jsonb(coalesce((select payout_delay_days from public.platform_financial_settings where id = true), 0))),
      ('affiliate.default_commission_bps', 'afiliados', 'Comissão padrão de afiliado', 'Percentual padrão de comissão do afiliado, em pontos-base.', 'percentage_bps', 'authenticated', to_jsonb(1000)),
      ('affiliate.attribution_window_days', 'afiliados', 'Janela de atribuição', 'Quantidade de dias em que uma indicação permanece atribuível.', 'integer', 'authenticated', to_jsonb(30)),
      ('jobs.credit_validity_days', 'vagas', 'Validade dos créditos de vagas', 'Quantidade de dias de validade de um lote de créditos comprado.', 'integer', 'authenticated', to_jsonb(180)),
      ('jobs.post_validity_days', 'vagas', 'Validade da publicação da vaga', 'Quantidade de dias em que uma vaga permanece publicada por crédito consumido.', 'integer', 'public', to_jsonb(30)),
      ('payments.refund_window_days', 'pagamentos', 'Prazo padrão de reembolso', 'Prazo padrão, em dias, usado na política comercial quando uma oferta não define regra própria.', 'integer', 'authenticated', to_jsonb(7)),
      ('payments.reserve_bps', 'pagamentos', 'Reserva financeira padrão', 'Percentual padrão retido temporariamente, em pontos-base.', 'percentage_bps', 'authenticated', to_jsonb(0))
  ) as values_table(key, category, label, description, value_type, visibility, value)
), inserted_parameters as (
  insert into public.commercial_parameters (
    key,
    category,
    label,
    description,
    value_type,
    scope_type,
    visibility,
    status
  )
  select seed.key, seed.category, seed.label, seed.description, seed.value_type, 'global', seed.visibility, 'active'
  from seed
  on conflict do nothing
  returning id, key
)
insert into public.commercial_parameter_versions (
  parameter_id,
  version,
  value,
  status,
  effective_from,
  published_at
)
select parameter.id, 1, seed.value, 'published', now(), now()
from seed
join public.commercial_parameters parameter
  on parameter.key = seed.key
 and parameter.scope_type = 'global'
 and parameter.scope_id is null
where not exists (
  select 1
  from public.commercial_parameter_versions version
  where version.parameter_id = parameter.id
);

commit;