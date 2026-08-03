begin;

create table if not exists public.beat_license_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  license_type text not null,
  name text not null,
  description text,
  price_cents integer not null,
  currency text not null default 'BRL',
  deliverables jsonb not null default '[]'::jsonb,
  usage_rights jsonb not null default '[]'::jsonb,
  max_copies integer,
  is_exclusive boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  is_demo boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beat_license_templates_type_check check (
    license_type in ('basic', 'pro', 'unlimited', 'exclusive')
  ),
  constraint beat_license_templates_price_check check (price_cents >= 0),
  constraint beat_license_templates_max_copies_check check (max_copies is null or max_copies > 0),
  constraint beat_license_templates_currency_check check (currency ~ '^[A-Z]{3}$')
);

drop trigger if exists set_beat_license_templates_updated_at on public.beat_license_templates;
create trigger set_beat_license_templates_updated_at
before update on public.beat_license_templates
for each row execute function public.set_updated_at();

alter table public.beat_license_templates enable row level security;

drop policy if exists beat_license_templates_public_read on public.beat_license_templates;
create policy beat_license_templates_public_read
on public.beat_license_templates
for select
to anon
using (active);

drop policy if exists beat_license_templates_authenticated_read on public.beat_license_templates;
create policy beat_license_templates_authenticated_read
on public.beat_license_templates
for select
to authenticated
using (active or public.is_platform_staff());

drop policy if exists beat_license_templates_staff_manage on public.beat_license_templates;
create policy beat_license_templates_staff_manage
on public.beat_license_templates
for all
to authenticated
using (public.is_platform_staff())
with check (public.is_platform_staff());

grant select on public.beat_license_templates to anon, authenticated;

create or replace function public.admin_upsert_beat_license_template(
  target_template_id uuid,
  target_code text,
  target_license_type text,
  target_name text,
  target_description text,
  target_price_cents integer,
  target_currency text,
  target_deliverables jsonb,
  target_usage_rights jsonb,
  target_max_copies integer,
  target_is_exclusive boolean,
  target_active boolean,
  target_sort_order integer default 0
)
returns public.beat_license_templates
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  result public.beat_license_templates;
begin
  if not public.is_platform_staff() then
    raise exception 'Acesso administrativo obrigatório.';
  end if;

  if target_license_type not in ('basic', 'pro', 'unlimited', 'exclusive')
    or target_price_cents < 0
    or (target_max_copies is not null and target_max_copies <= 0) then
    raise exception 'Dados comerciais da licença são inválidos.';
  end if;

  if target_template_id is null then
    insert into public.beat_license_templates (
      code,
      license_type,
      name,
      description,
      price_cents,
      currency,
      deliverables,
      usage_rights,
      max_copies,
      is_exclusive,
      active,
      sort_order,
      is_demo,
      created_by
    ) values (
      upper(trim(target_code)),
      target_license_type,
      trim(target_name),
      nullif(trim(coalesce(target_description, '')), ''),
      target_price_cents,
      upper(trim(target_currency)),
      coalesce(target_deliverables, '[]'::jsonb),
      coalesce(target_usage_rights, '[]'::jsonb),
      target_max_copies,
      target_is_exclusive,
      target_active,
      target_sort_order,
      false,
      (select auth.uid())
    )
    returning * into result;
  else
    update public.beat_license_templates
    set code = upper(trim(target_code)),
        license_type = target_license_type,
        name = trim(target_name),
        description = nullif(trim(coalesce(target_description, '')), ''),
        price_cents = target_price_cents,
        currency = upper(trim(target_currency)),
        deliverables = coalesce(target_deliverables, '[]'::jsonb),
        usage_rights = coalesce(target_usage_rights, '[]'::jsonb),
        max_copies = target_max_copies,
        is_exclusive = target_is_exclusive,
        active = target_active,
        sort_order = target_sort_order,
        is_demo = false
    where id = target_template_id
    returning * into result;
  end if;

  if result.id is null then
    raise exception 'Modelo de licença não encontrado.';
  end if;

  return result;
end;
$$;

grant execute on function public.admin_upsert_beat_license_template(uuid, text, text, text, text, integer, text, jsonb, jsonb, integer, boolean, boolean, integer) to authenticated;

alter table public.beat_licenses
  drop constraint if exists beat_licenses_license_type_check;

update public.beat_licenses
set license_type = 'pro',
    name = case when lower(name) like '%premium%' then 'Licença Pro' else name end,
    updated_at = now()
where license_type = 'premium' or lower(name) like '%premium%';

update public.beat_order_items
set license_name_snapshot = 'Licença Pro'
where lower(license_name_snapshot) like '%premium%';

alter table public.beat_licenses
  add constraint beat_licenses_license_type_check
  check (license_type in ('basic', 'pro', 'unlimited', 'exclusive'));

insert into public.beat_license_templates (
  code,
  license_type,
  name,
  description,
  price_cents,
  currency,
  deliverables,
  usage_rights,
  max_copies,
  is_exclusive,
  active,
  sort_order,
  is_demo
) values
  ('DEV_BEAT_START', 'basic', 'Licença Start', 'Modelo demonstrativo editável pelo Portal do Administrador.', 9900, 'BRL', '["MP3"]'::jsonb, '["Até 5.000 streams"]'::jsonb, 5000, false, true, 10, true),
  ('DEV_BEAT_PRO', 'pro', 'Licença Pro', 'Modelo demonstrativo editável pelo Portal do Administrador.', 19900, 'BRL', '["MP3", "WAV"]'::jsonb, '["Até 50.000 streams", "Monetização"]'::jsonb, 50000, false, true, 20, true),
  ('DEV_BEAT_EXCLUSIVE', 'exclusive', 'Licença Exclusiva', 'Modelo demonstrativo editável pelo Portal do Administrador.', 149900, 'BRL', '["MP3", "WAV", "Stems"]'::jsonb, '["Uso comercial exclusivo"]'::jsonb, null, true, true, 30, true)
on conflict (code) do update
set license_type = excluded.license_type,
    name = excluded.name,
    description = excluded.description,
    price_cents = excluded.price_cents,
    currency = excluded.currency,
    deliverables = excluded.deliverables,
    usage_rights = excluded.usage_rights,
    max_copies = excluded.max_copies,
    is_exclusive = excluded.is_exclusive,
    active = excluded.active,
    sort_order = excluded.sort_order,
    is_demo = true,
    updated_at = now();

commit;
