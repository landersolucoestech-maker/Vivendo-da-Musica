-- =========================================================================
-- Beat marketplace foundation.
--
-- Models beats, tiered licenses, copyright evidence, analytics, paid
-- licensing, delivery records and producer-facing reporting data.
-- =========================================================================

create type public.beat_status as enum ('draft', 'published', 'archived');
create type public.beat_license_type as enum ('basic', 'premium', 'unlimited', 'exclusive');
create type public.beat_copyright_status as enum ('pending', 'registered', 'failed');
create type public.beat_order_status as enum ('pending', 'paid', 'canceled', 'refunded');
create type public.beat_purchase_status as enum ('active', 'revoked', 'refunded');
create type public.beat_event_type as enum ('view', 'play', 'add_to_cart', 'checkout', 'purchase');

create table public.beats (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  slug text not null unique,
  description text,
  genre text not null,
  bpm integer,
  musical_key text,
  mood text,
  duration_seconds integer,
  cover_url text,
  preview_file_path text,
  master_file_path text,
  stems_file_path text,
  status public.beat_status not null default 'draft',
  copyright_status public.beat_copyright_status not null default 'pending',
  exclusive_available boolean not null default true,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.beat_licenses (
  id uuid primary key default gen_random_uuid(),
  beat_id uuid not null references public.beats(id) on delete cascade,
  license_type public.beat_license_type not null,
  name text not null,
  price_cents integer not null,
  currency text not null default 'BRL',
  usage_rights jsonb not null default '[]'::jsonb,
  deliverables jsonb not null default '[]'::jsonb,
  max_copies integer,
  is_exclusive boolean not null default false,
  available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (beat_id, license_type)
);

create table public.beat_copyright_evidence (
  id uuid primary key default gen_random_uuid(),
  beat_id uuid not null references public.beats(id) on delete cascade,
  producer_id uuid not null references auth.users(id) on delete cascade,
  evidence_code text not null unique,
  content_hash text not null,
  document_url text,
  metadata jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now()
);

create table public.beat_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  status public.beat_order_status not null default 'pending',
  provider text not null default 'stripe',
  provider_session_id text unique,
  provider_payment_id text,
  amount_cents integer not null default 0,
  currency text not null default 'BRL',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.beat_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.beat_orders(id) on delete cascade,
  beat_id uuid not null references public.beats(id) on delete restrict,
  license_id uuid not null references public.beat_licenses(id) on delete restrict,
  producer_id uuid not null references auth.users(id) on delete restrict,
  amount_cents integer not null,
  currency text not null default 'BRL',
  created_at timestamptz not null default now(),
  unique (order_id, license_id)
);

create table public.beat_license_purchases (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null unique references public.beat_order_items(id) on delete cascade,
  beat_id uuid not null references public.beats(id) on delete restrict,
  license_id uuid not null references public.beat_licenses(id) on delete restrict,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  producer_id uuid not null references auth.users(id) on delete restrict,
  status public.beat_purchase_status not null default 'active',
  license_document_url text,
  receipt_url text,
  issued_at timestamptz not null default now()
);

create table public.beat_deliveries (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.beat_license_purchases(id) on delete cascade,
  file_label text not null,
  file_path text not null,
  expires_at timestamptz,
  downloaded_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.beat_events (
  id uuid primary key default gen_random_uuid(),
  beat_id uuid not null references public.beats(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  event_type public.beat_event_type not null,
  session_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create trigger update_beats_updated_at
  before update on public.beats
  for each row execute function update_updated_at_column();

create trigger update_beat_licenses_updated_at
  before update on public.beat_licenses
  for each row execute function update_updated_at_column();

create trigger update_beat_orders_updated_at
  before update on public.beat_orders
  for each row execute function update_updated_at_column();

create or replace function public.is_beat_owner(target_beat_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.beats
    where id = target_beat_id
      and producer_id = (select auth.uid())
  );
$$;

revoke all on function public.is_beat_owner(uuid) from public;
grant execute on function public.is_beat_owner(uuid) to authenticated;

create or replace function public.register_beat_copyright()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  evidence_hash text;
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    evidence_hash := encode(
      digest(concat_ws('|', new.id::text, new.producer_id::text, new.title, coalesce(new.master_file_path, ''), now()::text), 'sha256'),
      'hex'
    );

    insert into public.beat_copyright_evidence (
      beat_id,
      producer_id,
      evidence_code,
      content_hash,
      metadata
    )
    values (
      new.id,
      new.producer_id,
      'VDA-BEAT-' || upper(substr(replace(new.id::text, '-', ''), 1, 12)),
      evidence_hash,
      jsonb_build_object('title', new.title, 'genre', new.genre, 'published_at', coalesce(new.published_at, now()))
    )
    on conflict (evidence_code) do nothing;

    new.copyright_status := 'registered';
    new.published_at := coalesce(new.published_at, now());
  end if;

  return new;
end;
$$;

revoke all on function public.register_beat_copyright() from public;

create trigger register_beat_copyright_before_publish
  before insert or update of status on public.beats
  for each row execute function public.register_beat_copyright();

create or replace function public.issue_beat_licenses_for_paid_order(target_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  paid_order record;
  item record;
  purchase_id uuid;
begin
  select id, buyer_id, status
  into paid_order
  from public.beat_orders
  where id = target_order_id;

  if paid_order.id is null or paid_order.status <> 'paid' then
    return;
  end if;

  for item in
    select boi.*, bl.is_exclusive, bl.deliverables, b.master_file_path, b.stems_file_path
    from public.beat_order_items boi
    join public.beat_licenses bl on bl.id = boi.license_id
    join public.beats b on b.id = boi.beat_id
    where boi.order_id = paid_order.id
  loop
    insert into public.beat_license_purchases (
      order_item_id,
      beat_id,
      license_id,
      buyer_id,
      producer_id,
      license_document_url,
      receipt_url
    )
    values (
      item.id,
      item.beat_id,
      item.license_id,
      paid_order.buyer_id,
      item.producer_id,
      '/documents/licenses/' || item.id::text || '.pdf',
      '/documents/receipts/' || target_order_id::text || '.pdf'
    )
    on conflict (order_item_id) do update
      set status = 'active'
    returning id into purchase_id;

    if item.master_file_path is not null then
      insert into public.beat_deliveries (purchase_id, file_label, file_path, expires_at)
      values (purchase_id, 'Master WAV/MP3', item.master_file_path, now() + interval '30 days')
      on conflict do nothing;
    end if;

    if item.stems_file_path is not null and item.is_exclusive then
      insert into public.beat_deliveries (purchase_id, file_label, file_path, expires_at)
      values (purchase_id, 'Stems completos', item.stems_file_path, now() + interval '30 days')
      on conflict do nothing;
    end if;

    insert into public.beat_events (beat_id, user_id, event_type, metadata)
    values (item.beat_id, paid_order.buyer_id, 'purchase', jsonb_build_object('license_id', item.license_id, 'amount_cents', item.amount_cents));

    if item.is_exclusive then
      update public.beats set exclusive_available = false where id = item.beat_id;
      update public.beat_licenses set available = false where beat_id = item.beat_id;
    end if;
  end loop;
end;
$$;

revoke all on function public.issue_beat_licenses_for_paid_order(uuid) from public;

create or replace function public.issue_beat_licenses_after_paid_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'paid' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    perform public.issue_beat_licenses_for_paid_order(new.id);
  end if;

  return new;
end;
$$;

revoke all on function public.issue_beat_licenses_after_paid_order() from public;

create trigger issue_beat_licenses_after_paid_order
  after insert or update of status on public.beat_orders
  for each row execute function public.issue_beat_licenses_after_paid_order();

alter table public.beats enable row level security;
alter table public.beat_licenses enable row level security;
alter table public.beat_copyright_evidence enable row level security;
alter table public.beat_orders enable row level security;
alter table public.beat_order_items enable row level security;
alter table public.beat_license_purchases enable row level security;
alter table public.beat_deliveries enable row level security;
alter table public.beat_events enable row level security;

create policy "Published beats are visible"
  on public.beats for select
  using (status = 'published');

create policy "Producers manage their beats"
  on public.beats for all
  to authenticated
  using ((select auth.uid()) = producer_id or public.is_admin())
  with check ((select auth.uid()) = producer_id or public.is_admin());

create policy "Published beat licenses are visible"
  on public.beat_licenses for select
  using (exists (select 1 from public.beats b where b.id = beat_licenses.beat_id and b.status = 'published'));

create policy "Beat owners manage licenses"
  on public.beat_licenses for all
  to authenticated
  using (public.is_beat_owner(beat_id) or public.is_admin())
  with check (public.is_beat_owner(beat_id) or public.is_admin());

create policy "Producers view copyright evidence"
  on public.beat_copyright_evidence for select
  to authenticated
  using ((select auth.uid()) = producer_id or public.is_admin());

create policy "Users view their beat orders"
  on public.beat_orders for select
  to authenticated
  using ((select auth.uid()) = buyer_id or public.is_admin());

create policy "Producers view order items for their beats"
  on public.beat_order_items for select
  to authenticated
  using ((select auth.uid()) = producer_id or public.is_admin());

create policy "Buyers view own order items"
  on public.beat_order_items for select
  to authenticated
  using (
    exists (
      select 1 from public.beat_orders bo
      where bo.id = beat_order_items.order_id
        and bo.buyer_id = (select auth.uid())
    )
  );

create policy "Buyers and producers view purchases"
  on public.beat_license_purchases for select
  to authenticated
  using ((select auth.uid()) in (buyer_id, producer_id) or public.is_admin());

create policy "Buyers view delivery records"
  on public.beat_deliveries for select
  to authenticated
  using (
    exists (
      select 1 from public.beat_license_purchases blp
      where blp.id = beat_deliveries.purchase_id
        and blp.buyer_id = (select auth.uid())
        and blp.status = 'active'
    )
  );

create policy "Authenticated users can record beat events"
  on public.beat_events for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Producers view events for their beats"
  on public.beat_events for select
  to authenticated
  using (public.is_beat_owner(beat_id) or public.is_admin());
