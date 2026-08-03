begin;

create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_listings (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.service_categories(id) on delete restrict,
  slug text not null unique,
  title text not null,
  short_description text,
  description text not null,
  requirements text[] not null default '{}'::text[],
  portfolio_urls text[] not null default '{}'::text[],
  status text not null default 'draft',
  moderation_status text not null default 'pending',
  rating_average numeric(3,2) not null default 0,
  rating_count integer not null default 0,
  completed_contracts integer not null default 0,
  is_demo boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_listings_status_check check (status in ('draft','published','paused','archived')),
  constraint service_listings_moderation_check check (moderation_status in ('pending','approved','rejected')),
  constraint service_listings_rating_check check (rating_average between 0 and 5 and rating_count >= 0 and completed_contracts >= 0)
);

create table if not exists public.service_packages (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.service_listings(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  price_cents bigint not null,
  currency text not null default 'BRL',
  delivery_days integer not null,
  revisions integer not null default 0,
  deliverables text[] not null default '{}'::text[],
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_packages_price_check check (price_cents >= 0),
  constraint service_packages_delivery_check check (delivery_days > 0 and revisions >= 0),
  constraint service_packages_currency_check check (currency ~ '^[A-Z]{3}$'),
  unique (listing_id, code)
);

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.service_categories(id) on delete set null,
  listing_id uuid references public.service_listings(id) on delete set null,
  title text not null,
  brief text not null,
  budget_min_cents bigint,
  budget_max_cents bigint,
  currency text not null default 'BRL',
  desired_delivery_date date,
  status text not null default 'open',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_requests_budget_check check (
    (budget_min_cents is null or budget_min_cents >= 0)
    and (budget_max_cents is null or budget_max_cents >= 0)
    and (budget_min_cents is null or budget_max_cents is null or budget_max_cents >= budget_min_cents)
  ),
  constraint service_requests_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint service_requests_status_check check (status in ('open','proposal_selected','contracted','closed','canceled'))
);

create table if not exists public.service_proposals (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  provider_id uuid not null references auth.users(id) on delete cascade,
  amount_cents bigint not null,
  currency text not null default 'BRL',
  delivery_days integer not null,
  revisions integer not null default 0,
  scope text not null,
  deliverables text[] not null default '{}'::text[],
  status text not null default 'submitted',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_proposals_amount_check check (amount_cents >= 0),
  constraint service_proposals_delivery_check check (delivery_days > 0 and revisions >= 0),
  constraint service_proposals_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint service_proposals_status_check check (status in ('submitted','accepted','rejected','withdrawn','expired')),
  unique (request_id, provider_id)
);

create table if not exists public.service_contracts (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete restrict,
  provider_id uuid not null references auth.users(id) on delete restrict,
  listing_id uuid references public.service_listings(id) on delete set null,
  package_id uuid references public.service_packages(id) on delete set null,
  proposal_id uuid references public.service_proposals(id) on delete set null,
  order_id uuid references public.commerce_orders(id) on delete set null,
  order_item_id uuid unique references public.commerce_order_items(id) on delete set null,
  title_snapshot text not null,
  scope_snapshot text not null,
  deliverables_snapshot text[] not null default '{}'::text[],
  revisions_included integer not null default 0,
  total_cents bigint not null,
  currency text not null default 'BRL',
  status text not null default 'active',
  started_at timestamptz not null default now(),
  due_at timestamptz,
  completed_at timestamptz,
  canceled_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_contracts_amount_check check (total_cents >= 0 and revisions_included >= 0),
  constraint service_contracts_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint service_contracts_status_check check (status in ('active','delivery_submitted','revision_requested','completed','disputed','canceled','refunded'))
);

create table if not exists public.service_milestones (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.service_contracts(id) on delete cascade,
  title text not null,
  description text,
  amount_cents bigint not null,
  currency text not null default 'BRL',
  order_index integer not null default 0,
  due_at timestamptz,
  status text not null default 'pending',
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_milestones_amount_check check (amount_cents >= 0),
  constraint service_milestones_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint service_milestones_status_check check (status in ('pending','in_progress','submitted','revision_requested','accepted','disputed','canceled')),
  unique (contract_id, order_index)
);

create table if not exists public.service_deliveries (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.service_milestones(id) on delete cascade,
  submitted_by uuid not null references auth.users(id) on delete restrict,
  notes text,
  file_paths jsonb not null default '[]'::jsonb,
  version integer not null,
  status text not null default 'submitted',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint service_deliveries_version_check check (version > 0),
  constraint service_deliveries_status_check check (status in ('submitted','accepted','revision_requested','superseded')),
  unique (milestone_id, version)
);

create table if not exists public.service_disputes (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.service_contracts(id) on delete cascade,
  opened_by uuid not null references auth.users(id) on delete restrict,
  reason text not null,
  description text not null,
  status text not null default 'open',
  resolution text,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_disputes_status_check check (status in ('open','under_review','resolved_buyer','resolved_provider','resolved_split','closed'))
);

create table if not exists public.service_reviews (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.service_contracts(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  reviewed_user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_reviews_rating_check check (rating between 1 and 5),
  unique (contract_id, reviewer_id)
);

create table if not exists public.service_messages (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.service_contracts(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  attachment_paths jsonb not null default '[]'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists service_listings_catalog_idx on public.service_listings (status, moderation_status, published_at desc);
create index if not exists service_packages_listing_idx on public.service_packages (listing_id, active, sort_order);
create index if not exists service_requests_client_idx on public.service_requests (client_id, created_at desc);
create index if not exists service_proposals_provider_idx on public.service_proposals (provider_id, created_at desc);
create index if not exists service_contracts_buyer_idx on public.service_contracts (buyer_id, created_at desc);
create index if not exists service_contracts_provider_idx on public.service_contracts (provider_id, created_at desc);
create index if not exists service_milestones_contract_idx on public.service_milestones (contract_id, order_index);
create index if not exists service_messages_contract_idx on public.service_messages (contract_id, created_at);

drop trigger if exists set_service_categories_updated_at on public.service_categories;
create trigger set_service_categories_updated_at before update on public.service_categories for each row execute function public.set_updated_at();
drop trigger if exists set_service_listings_updated_at on public.service_listings;
create trigger set_service_listings_updated_at before update on public.service_listings for each row execute function public.set_updated_at();
drop trigger if exists set_service_packages_updated_at on public.service_packages;
create trigger set_service_packages_updated_at before update on public.service_packages for each row execute function public.set_updated_at();
drop trigger if exists set_service_requests_updated_at on public.service_requests;
create trigger set_service_requests_updated_at before update on public.service_requests for each row execute function public.set_updated_at();
drop trigger if exists set_service_proposals_updated_at on public.service_proposals;
create trigger set_service_proposals_updated_at before update on public.service_proposals for each row execute function public.set_updated_at();
drop trigger if exists set_service_contracts_updated_at on public.service_contracts;
create trigger set_service_contracts_updated_at before update on public.service_contracts for each row execute function public.set_updated_at();
drop trigger if exists set_service_milestones_updated_at on public.service_milestones;
create trigger set_service_milestones_updated_at before update on public.service_milestones for each row execute function public.set_updated_at();
drop trigger if exists set_service_disputes_updated_at on public.service_disputes;
create trigger set_service_disputes_updated_at before update on public.service_disputes for each row execute function public.set_updated_at();
drop trigger if exists set_service_reviews_updated_at on public.service_reviews;
create trigger set_service_reviews_updated_at before update on public.service_reviews for each row execute function public.set_updated_at();

commit;
