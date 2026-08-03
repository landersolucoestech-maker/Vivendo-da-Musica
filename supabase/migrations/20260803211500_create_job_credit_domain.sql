begin;

create table if not exists public.job_credit_packs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  credit_quantity integer not null,
  price_cents integer not null,
  currency text not null default 'BRL',
  validity_days integer not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  is_demo boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_credit_packs_code_check check (code ~ '^[A-Z0-9][A-Z0-9_-]{1,39}$'),
  constraint job_credit_packs_credit_quantity_check check (credit_quantity > 0),
  constraint job_credit_packs_price_check check (price_cents >= 0),
  constraint job_credit_packs_validity_check check (validity_days > 0),
  constraint job_credit_packs_currency_check check (currency ~ '^[A-Z]{3}$')
);

drop trigger if exists set_job_credit_packs_updated_at on public.job_credit_packs;
create trigger set_job_credit_packs_updated_at
before update on public.job_credit_packs
for each row execute function public.set_updated_at();

create table if not exists public.company_credit_lots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.company_profiles(id) on delete cascade,
  pack_id uuid references public.job_credit_packs(id) on delete set null,
  source_order_id uuid,
  purchased_credits integer not null,
  remaining_credits integer not null,
  expires_at timestamptz not null,
  status text not null default 'active',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_credit_lots_purchased_check check (purchased_credits > 0),
  constraint company_credit_lots_remaining_check check (
    remaining_credits >= 0 and remaining_credits <= purchased_credits
  ),
  constraint company_credit_lots_status_check check (
    status in ('active', 'exhausted', 'expired', 'refunded')
  )
);

create index if not exists company_credit_lots_consumption_idx
  on public.company_credit_lots (company_id, status, expires_at, created_at)
  where remaining_credits > 0;

create unique index if not exists company_credit_lots_source_order_idx
  on public.company_credit_lots (source_order_id)
  where source_order_id is not null;

drop trigger if exists set_company_credit_lots_updated_at on public.company_credit_lots;
create trigger set_company_credit_lots_updated_at
before update on public.company_credit_lots
for each row execute function public.set_updated_at();

create table if not exists public.company_credit_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.company_profiles(id) on delete cascade,
  lot_id uuid references public.company_credit_lots(id) on delete set null,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  event_type text not null,
  quantity integer not null,
  balance_after integer not null,
  reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint company_credit_events_type_check check (
    event_type in ('purchase', 'consume', 'expire', 'refund', 'adjustment')
  ),
  constraint company_credit_events_quantity_check check (quantity <> 0),
  constraint company_credit_events_balance_check check (balance_after >= 0)
);

create index if not exists company_credit_events_company_created_idx
  on public.company_credit_events (company_id, created_at desc);

alter table public.opportunities
  add column if not exists posting_expires_at timestamptz,
  add column if not exists credit_lot_id uuid references public.company_credit_lots(id) on delete set null,
  add column if not exists credit_event_id uuid references public.company_credit_events(id) on delete set null,
  add column if not exists renewal_count integer not null default 0;

alter table public.opportunities
  drop constraint if exists opportunities_renewal_count_check;
alter table public.opportunities
  add constraint opportunities_renewal_count_check check (renewal_count >= 0);

alter table public.job_credit_packs enable row level security;
alter table public.company_credit_lots enable row level security;
alter table public.company_credit_events enable row level security;

drop policy if exists job_credit_packs_public_read on public.job_credit_packs;
create policy job_credit_packs_public_read
on public.job_credit_packs
for select
to anon
using (active);

drop policy if exists job_credit_packs_authenticated_read on public.job_credit_packs;
create policy job_credit_packs_authenticated_read
on public.job_credit_packs
for select
to authenticated
using (active or public.is_platform_staff());

drop policy if exists job_credit_packs_staff_manage on public.job_credit_packs;
create policy job_credit_packs_staff_manage
on public.job_credit_packs
for all
to authenticated
using (public.is_platform_staff())
with check (public.is_platform_staff());

drop policy if exists company_credit_lots_member_read on public.company_credit_lots;
create policy company_credit_lots_member_read
on public.company_credit_lots
for select
to authenticated
using (public.is_company_member(company_id));

drop policy if exists company_credit_lots_demo_read on public.company_credit_lots;
create policy company_credit_lots_demo_read
on public.company_credit_lots
for select
to anon
using (
  is_demo
  and exists (
    select 1
    from public.company_profiles company
    where company.id = company_id
      and company.is_demo
  )
);

drop policy if exists company_credit_lots_staff_manage on public.company_credit_lots;
create policy company_credit_lots_staff_manage
on public.company_credit_lots
for all
to authenticated
using (public.is_platform_staff())
with check (public.is_platform_staff());

drop policy if exists company_credit_events_member_read on public.company_credit_events;
create policy company_credit_events_member_read
on public.company_credit_events
for select
to authenticated
using (public.is_company_member(company_id));

drop policy if exists company_credit_events_demo_read on public.company_credit_events;
create policy company_credit_events_demo_read
on public.company_credit_events
for select
to anon
using (
  exists (
    select 1
    from public.company_profiles company
    where company.id = company_id
      and company.is_demo
  )
);

drop policy if exists company_credit_events_staff_manage on public.company_credit_events;
create policy company_credit_events_staff_manage
on public.company_credit_events
for all
to authenticated
using (public.is_platform_staff())
with check (public.is_platform_staff());

grant select on public.job_credit_packs to anon, authenticated;
grant select on public.company_credit_lots to anon, authenticated;
grant select on public.company_credit_events to anon, authenticated;

create or replace view public.company_credit_balances
with (security_invoker = true)
as
select
  company.id as company_id,
  coalesce(sum(
    case
      when lot.status = 'active'
        and lot.expires_at > now()
        and lot.remaining_credits > 0
      then lot.remaining_credits
      else 0
    end
  ), 0)::integer as available_credits,
  min(lot.expires_at) filter (
    where lot.status = 'active'
      and lot.expires_at > now()
      and lot.remaining_credits > 0
  ) as next_expiration_at
from public.company_profiles company
left join public.company_credit_lots lot on lot.company_id = company.id
group by company.id;

grant select on public.company_credit_balances to anon, authenticated;

create or replace function public.admin_upsert_job_credit_pack(
  target_pack_id uuid,
  target_code text,
  target_name text,
  target_description text,
  target_credit_quantity integer,
  target_price_cents integer,
  target_currency text,
  target_validity_days integer,
  target_active boolean,
  target_sort_order integer default 0
)
returns public.job_credit_packs
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  result public.job_credit_packs;
begin
  if not public.is_platform_staff() then
    raise exception 'Acesso administrativo obrigatório.';
  end if;

  if target_credit_quantity <= 0 or target_price_cents < 0 or target_validity_days <= 0 then
    raise exception 'Quantidade, preço ou validade inválidos.';
  end if;

  if target_pack_id is null then
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
      is_demo,
      created_by
    ) values (
      upper(trim(target_code)),
      trim(target_name),
      nullif(trim(coalesce(target_description, '')), ''),
      target_credit_quantity,
      target_price_cents,
      upper(trim(target_currency)),
      target_validity_days,
      target_active,
      target_sort_order,
      false,
      (select auth.uid())
    )
    returning * into result;
  else
    update public.job_credit_packs
    set code = upper(trim(target_code)),
        name = trim(target_name),
        description = nullif(trim(coalesce(target_description, '')), ''),
        credit_quantity = target_credit_quantity,
        price_cents = target_price_cents,
        currency = upper(trim(target_currency)),
        validity_days = target_validity_days,
        active = target_active,
        sort_order = target_sort_order,
        is_demo = false
    where id = target_pack_id
    returning * into result;
  end if;

  if result.id is null then
    raise exception 'Pacote não encontrado.';
  end if;

  return result;
end;
$$;

grant execute on function public.admin_upsert_job_credit_pack(uuid, text, text, text, integer, integer, text, integer, boolean, integer) to authenticated;

create or replace function public.admin_grant_company_credits(
  target_company_id uuid,
  target_pack_id uuid,
  target_credit_quantity integer default null,
  target_reference text default null
)
returns public.company_credit_lots
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  pack public.job_credit_packs;
  credits integer;
  total_balance integer;
  result public.company_credit_lots;
begin
  if not public.is_platform_staff() then
    raise exception 'Acesso administrativo obrigatório.';
  end if;

  select * into pack
  from public.job_credit_packs
  where id = target_pack_id;

  if pack.id is null then
    raise exception 'Pacote não encontrado.';
  end if;

  credits := coalesce(target_credit_quantity, pack.credit_quantity);
  if credits <= 0 then
    raise exception 'Quantidade de créditos inválida.';
  end if;

  insert into public.company_credit_lots (
    company_id,
    pack_id,
    purchased_credits,
    remaining_credits,
    expires_at,
    status,
    is_demo
  ) values (
    target_company_id,
    pack.id,
    credits,
    credits,
    now() + make_interval(days => pack.validity_days),
    'active',
    false
  )
  returning * into result;

  select coalesce(sum(remaining_credits), 0)::integer
  into total_balance
  from public.company_credit_lots
  where company_id = target_company_id
    and status = 'active'
    and expires_at > now();

  insert into public.company_credit_events (
    company_id,
    lot_id,
    event_type,
    quantity,
    balance_after,
    reference,
    created_by
  ) values (
    target_company_id,
    result.id,
    'adjustment',
    credits,
    total_balance,
    target_reference,
    (select auth.uid())
  );

  return result;
end;
$$;

grant execute on function public.admin_grant_company_credits(uuid, uuid, integer, text) to authenticated;

commit;