-- =========================================================================
-- Course payment access automation.
--
-- Stripe/webhook code records a paid course order here; database triggers
-- immediately grant active enrollments for every course in the order.
-- =========================================================================

create type public.course_order_status as enum ('pending', 'paid', 'canceled', 'refunded');

create table public.course_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status public.course_order_status not null default 'pending',
  provider text not null default 'stripe',
  provider_session_id text unique,
  provider_payment_id text,
  amount_cents integer not null default 0,
  currency text not null default 'BRL',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.course_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.course_orders(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete restrict,
  amount_cents integer not null default 0,
  created_at timestamptz not null default now(),
  unique (order_id, course_id)
);

create trigger update_course_orders_updated_at
  before update on public.course_orders
  for each row execute function update_updated_at_column();

alter table public.course_orders enable row level security;
alter table public.course_order_items enable row level security;

create policy "Users can view their own course orders"
  on public.course_orders for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Admins can view course orders"
  on public.course_orders for select
  to authenticated
  using (public.is_admin());

create policy "Admins can manage course orders"
  on public.course_orders for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Users can view their own course order items"
  on public.course_order_items for select
  to authenticated
  using (
    exists (
      select 1
      from public.course_orders co
      where co.id = course_order_items.order_id
        and co.user_id = (select auth.uid())
    )
  );

create policy "Admins can view course order items"
  on public.course_order_items for select
  to authenticated
  using (public.is_admin());

create policy "Admins can manage course order items"
  on public.course_order_items for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.grant_enrollments_for_paid_order(target_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  paid_order record;
begin
  select id, user_id, status
  into paid_order
  from public.course_orders
  where id = target_order_id;

  if paid_order.id is null or paid_order.status <> 'paid' then
    return;
  end if;

  insert into public.enrollments (user_id, course_id, status, source)
  select paid_order.user_id, coi.course_id, 'active', 'stripe'
  from public.course_order_items coi
  where coi.order_id = paid_order.id
  on conflict (user_id, course_id) do update
    set status = 'active',
        source = 'stripe',
        updated_at = now();
end;
$$;

revoke all on function public.grant_enrollments_for_paid_order(uuid) from public;

create or replace function public.grant_enrollments_after_paid_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'paid' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    perform public.grant_enrollments_for_paid_order(new.id);
  end if;

  return new;
end;
$$;

revoke all on function public.grant_enrollments_after_paid_order() from public;

create trigger grant_enrollments_after_paid_order
  after insert or update of status on public.course_orders
  for each row execute function public.grant_enrollments_after_paid_order();

create or replace function public.grant_enrollment_after_paid_order_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.grant_enrollments_for_paid_order(new.order_id);
  return new;
end;
$$;

revoke all on function public.grant_enrollment_after_paid_order_item() from public;

create trigger grant_enrollment_after_paid_order_item
  after insert on public.course_order_items
  for each row execute function public.grant_enrollment_after_paid_order_item();
