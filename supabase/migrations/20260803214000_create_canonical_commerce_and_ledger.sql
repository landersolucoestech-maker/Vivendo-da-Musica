begin;

create table if not exists public.commerce_offers (
  id uuid primary key default gen_random_uuid(),
  resource_type text not null,
  resource_id uuid not null,
  seller_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'draft',
  currency text not null default 'BRL',
  access_duration_days integer,
  metadata jsonb not null default '{}'::jsonb,
  is_demo boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commerce_offers_resource_type_check check (
    resource_type in ('course','digital_product','beat_license','job_credit_pack','service')
  ),
  constraint commerce_offers_status_check check (status in ('draft','active','archived')),
  constraint commerce_offers_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint commerce_offers_duration_check check (access_duration_days is null or access_duration_days > 0),
  unique (resource_type, resource_id)
);

create table if not exists public.commerce_offer_prices (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.commerce_offers(id) on delete cascade,
  version integer not null,
  amount_cents bigint not null,
  compare_at_cents bigint,
  currency text not null default 'BRL',
  status text not null default 'draft',
  effective_from timestamptz not null default now(),
  effective_until timestamptz,
  commercial_snapshot jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  constraint commerce_offer_prices_amount_check check (amount_cents >= 0),
  constraint commerce_offer_prices_compare_check check (compare_at_cents is null or compare_at_cents >= amount_cents),
  constraint commerce_offer_prices_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint commerce_offer_prices_status_check check (status in ('draft','published','archived')),
  constraint commerce_offer_prices_period_check check (effective_until is null or effective_until > effective_from),
  unique (offer_id, version)
);

create unique index if not exists commerce_offer_prices_one_current_idx
on public.commerce_offer_prices (offer_id)
where status = 'published' and effective_until is null;

create table if not exists public.commerce_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending',
  currency text not null default 'BRL',
  subtotal_cents bigint not null default 0,
  discount_cents bigint not null default 0,
  tax_cents bigint not null default 0,
  total_cents bigint not null default 0,
  provider text,
  provider_reference text,
  idempotency_key text,
  source_order_kind text,
  source_order_id uuid,
  checkout_snapshot jsonb not null default '{}'::jsonb,
  is_demo boolean not null default false,
  paid_at timestamptz,
  refunded_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commerce_orders_status_check check (
    status in ('pending','processing','paid','partially_refunded','refunded','canceled','failed','chargeback')
  ),
  constraint commerce_orders_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint commerce_orders_amounts_check check (
    subtotal_cents >= 0 and discount_cents >= 0 and tax_cents >= 0 and total_cents >= 0
  ),
  constraint commerce_orders_total_check check (total_cents = greatest(subtotal_cents - discount_cents + tax_cents, 0)),
  constraint commerce_orders_source_check check (
    (source_order_kind is null and source_order_id is null)
    or (source_order_kind in ('course','digital_product','beat','job_credit','service') and source_order_id is not null)
  ),
  unique (source_order_kind, source_order_id),
  unique (provider, provider_reference),
  unique (idempotency_key)
);

create table if not exists public.commerce_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.commerce_orders(id) on delete cascade,
  offer_id uuid references public.commerce_offers(id) on delete set null,
  offer_price_id uuid references public.commerce_offer_prices(id) on delete set null,
  resource_type text not null,
  resource_id uuid not null,
  seller_id uuid references auth.users(id) on delete set null,
  title_snapshot text not null,
  quantity integer not null default 1,
  unit_amount_cents bigint not null,
  gross_amount_cents bigint not null,
  discount_cents bigint not null default 0,
  platform_commission_bps integer not null default 0,
  platform_commission_cents bigint not null default 0,
  affiliate_id uuid,
  affiliate_commission_bps integer not null default 0,
  affiliate_commission_cents bigint not null default 0,
  seller_net_cents bigint not null default 0,
  commercial_snapshot jsonb not null default '{}'::jsonb,
  source_item_kind text,
  source_item_id uuid,
  created_at timestamptz not null default now(),
  constraint commerce_order_items_resource_type_check check (
    resource_type in ('course','digital_product','beat_license','job_credit_pack','service')
  ),
  constraint commerce_order_items_quantity_check check (quantity > 0),
  constraint commerce_order_items_amount_check check (
    unit_amount_cents >= 0 and gross_amount_cents >= 0 and discount_cents >= 0
    and platform_commission_cents >= 0 and affiliate_commission_cents >= 0 and seller_net_cents >= 0
  ),
  constraint commerce_order_items_bps_check check (
    platform_commission_bps between 0 and 10000 and affiliate_commission_bps between 0 and 10000
  ),
  constraint commerce_order_items_gross_check check (gross_amount_cents = unit_amount_cents * quantity),
  constraint commerce_order_items_split_check check (
    platform_commission_cents + affiliate_commission_cents + seller_net_cents
    = greatest(gross_amount_cents - discount_cents, 0)
  ),
  constraint commerce_order_items_source_check check (
    (source_item_kind is null and source_item_id is null)
    or (source_item_kind in ('course','digital_product','beat','job_credit','service') and source_item_id is not null)
  ),
  unique (source_item_kind, source_item_id)
);

create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.commerce_orders(id) on delete cascade,
  provider text not null,
  provider_reference text,
  payment_method text,
  installments integer,
  amount_cents bigint not null,
  currency text not null default 'BRL',
  status text not null default 'created',
  failure_code text,
  failure_message text,
  provider_payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_attempts_amount_check check (amount_cents >= 0),
  constraint payment_attempts_installments_check check (installments is null or installments > 0),
  constraint payment_attempts_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint payment_attempts_status_check check (
    status in ('created','pending','authorized','paid','failed','canceled','expired')
  ),
  unique (provider, provider_reference),
  unique (idempotency_key)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.commerce_orders(id) on delete cascade,
  attempt_id uuid references public.payment_attempts(id) on delete set null,
  provider text not null,
  provider_reference text not null,
  payment_method text,
  gross_amount_cents bigint not null,
  provider_fee_cents bigint not null default 0,
  net_received_cents bigint not null,
  currency text not null default 'BRL',
  status text not null default 'paid',
  paid_at timestamptz not null,
  refunded_amount_cents bigint not null default 0,
  chargeback_amount_cents bigint not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_amount_check check (
    gross_amount_cents >= 0 and provider_fee_cents >= 0 and net_received_cents >= 0
    and refunded_amount_cents >= 0 and chargeback_amount_cents >= 0
  ),
  constraint payments_net_check check (net_received_cents = greatest(gross_amount_cents - provider_fee_cents, 0)),
  constraint payments_refund_check check (refunded_amount_cents + chargeback_amount_cents <= gross_amount_cents),
  constraint payments_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint payments_status_check check (
    status in ('paid','partially_refunded','refunded','chargeback','canceled')
  ),
  unique (provider, provider_reference)
);

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  signature_valid boolean not null,
  payload_sha256 text not null,
  payload jsonb not null,
  status text not null default 'received',
  processed_at timestamptz,
  error_message text,
  received_at timestamptz not null default now(),
  constraint payment_webhook_events_status_check check (
    status in ('received','processed','ignored','failed')
  ),
  unique (provider, provider_event_id)
);

create table if not exists public.commerce_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.commerce_orders(id) on delete set null,
  order_item_id uuid references public.commerce_order_items(id) on delete set null,
  resource_type text not null,
  resource_id uuid not null,
  status text not null default 'active',
  granted_at timestamptz not null default now(),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoke_reason text,
  metadata jsonb not null default '{}'::jsonb,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commerce_entitlements_resource_type_check check (
    resource_type in ('course','digital_product','beat_license','job_credit_pack','service')
  ),
  constraint commerce_entitlements_status_check check (
    status in ('active','expired','revoked','refunded')
  ),
  constraint commerce_entitlements_period_check check (expires_at is null or expires_at > starts_at),
  unique (user_id, order_item_id, resource_type, resource_id)
);

create table if not exists public.revenue_splits (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.commerce_order_items(id) on delete cascade,
  beneficiary_type text not null,
  beneficiary_id uuid,
  amount_cents bigint not null,
  percentage_bps integer not null,
  status text not null default 'pending',
  available_at timestamptz,
  settled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint revenue_splits_beneficiary_type_check check (
    beneficiary_type in ('platform','seller','affiliate','coproducer','tax','payment_provider')
  ),
  constraint revenue_splits_amount_check check (amount_cents >= 0),
  constraint revenue_splits_bps_check check (percentage_bps between 0 and 10000),
  constraint revenue_splits_status_check check (
    status in ('pending','available','reserved','paid','reversed')
  )
);

create unique index if not exists revenue_splits_unique_beneficiary_idx
on public.revenue_splits (
  order_item_id,
  beneficiary_type,
  coalesce(beneficiary_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

create table if not exists public.ledger_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null,
  owner_id uuid,
  account_code text not null,
  name text not null,
  currency text not null default 'BRL',
  normal_balance text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  constraint ledger_accounts_owner_type_check check (
    owner_type in ('platform','user','company','affiliate','provider','tax_authority')
  ),
  constraint ledger_accounts_code_check check (account_code ~ '^[a-z0-9][a-z0-9._-]{1,79}$'),
  constraint ledger_accounts_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint ledger_accounts_normal_check check (normal_balance in ('debit','credit')),
  constraint ledger_accounts_status_check check (status in ('active','archived'))
);

create unique index if not exists ledger_accounts_owner_code_idx
on public.ledger_accounts (
  owner_type,
  coalesce(owner_id, '00000000-0000-0000-0000-000000000000'::uuid),
  account_code,
  currency
);

create table if not exists public.ledger_transactions (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  reference_type text not null,
  reference_id uuid not null,
  description text not null,
  currency text not null default 'BRL',
  metadata jsonb not null default '{}'::jsonb,
  is_demo boolean not null default false,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint ledger_transactions_currency_check check (currency ~ '^[A-Z]{3}$'),
  unique (event_type, reference_type, reference_id)
);

create table if not exists public.ledger_postings (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.ledger_transactions(id) on delete restrict,
  account_id uuid not null references public.ledger_accounts(id) on delete restrict,
  direction text not null,
  amount_cents bigint not null,
  memo text,
  created_at timestamptz not null default now(),
  constraint ledger_postings_direction_check check (direction in ('debit','credit')),
  constraint ledger_postings_amount_check check (amount_cents > 0)
);

create index if not exists ledger_postings_account_created_idx
on public.ledger_postings (account_id, created_at desc);

create table if not exists public.payout_destinations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  destination_type text not null,
  display_label text not null,
  encrypted_reference text,
  verified boolean not null default false,
  is_default boolean not null default false,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payout_destinations_type_check check (destination_type in ('pix','bank_account')),
  constraint payout_destinations_status_check check (status in ('active','archived'))
);

create unique index if not exists payout_destinations_one_default_idx
on public.payout_destinations (owner_user_id)
where is_default and status = 'active';

create table if not exists public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  destination_id uuid not null references public.payout_destinations(id) on delete restrict,
  amount_cents bigint not null,
  currency text not null default 'BRL',
  status text not null default 'requested',
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  provider_reference text,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payout_requests_amount_check check (amount_cents > 0),
  constraint payout_requests_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint payout_requests_status_check check (
    status in ('requested','processing','paid','failed','rejected','canceled')
  )
);

create table if not exists public.commerce_order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.commerce_orders(id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text,
  actor_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists commerce_orders_buyer_created_idx on public.commerce_orders (buyer_id, created_at desc);
create index if not exists commerce_order_items_seller_created_idx on public.commerce_order_items (seller_id, created_at desc);
create index if not exists payment_attempts_order_created_idx on public.payment_attempts (order_id, created_at desc);
create index if not exists payments_order_created_idx on public.payments (order_id, created_at desc);
create index if not exists entitlements_user_resource_idx on public.commerce_entitlements (user_id, resource_type, resource_id, status);
create index if not exists revenue_splits_beneficiary_status_idx on public.revenue_splits (beneficiary_id, status, available_at);
create index if not exists payout_requests_owner_status_idx on public.payout_requests (owner_user_id, status, requested_at desc);

commit;
