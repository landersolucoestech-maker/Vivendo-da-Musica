alter table public.digital_product_orders
  add column idempotency_key text unique;

create or replace function public.create_digital_product_order(
  target_buyer_id uuid,
  target_product_ids uuid[],
  target_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_order public.digital_product_orders;
  existing_order public.digital_product_orders;
  product_count integer;
  product_currency text;
  order_total integer;
begin
  if target_buyer_id is null then raise exception 'Buyer is required'; end if;
  if target_idempotency_key is null or char_length(target_idempotency_key) < 16 then raise exception 'Invalid idempotency key'; end if;
  if coalesce(cardinality(target_product_ids), 0) < 1 or cardinality(target_product_ids) > 20 then raise exception 'Choose between 1 and 20 products'; end if;
  if cardinality(target_product_ids) <> (select count(distinct value) from unnest(target_product_ids) as value) then raise exception 'Duplicate products are not allowed'; end if;

  select * into existing_order from public.digital_product_orders where idempotency_key = target_idempotency_key;
  if found then
    if existing_order.buyer_id <> target_buyer_id then raise exception 'Idempotency key belongs to another buyer'; end if;
    return jsonb_build_object('order_id', existing_order.id, 'amount_cents', existing_order.amount_cents, 'currency', existing_order.currency, 'existing', true);
  end if;

  select count(*), min(currency), sum(price_cents)::integer
  into product_count, product_currency, order_total
  from public.seller_products
  where id = any(target_product_ids)
    and status = 'published'
    and seller_id <> target_buyer_id;

  if product_count <> cardinality(target_product_ids) then raise exception 'One or more products are unavailable'; end if;
  if (select count(distinct currency) from public.seller_products where id = any(target_product_ids)) <> 1 then raise exception 'Products must use the same currency'; end if;

  insert into public.digital_product_orders (buyer_id, status, provider, amount_cents, currency, idempotency_key)
  values (target_buyer_id, 'pending', 'stripe', order_total, product_currency, target_idempotency_key)
  returning * into created_order;

  insert into public.digital_product_order_items (order_id, product_id, seller_id, product_title_snapshot, amount_cents, currency)
  select created_order.id, id, seller_id, title, price_cents, currency
  from public.seller_products where id = any(target_product_ids);

  return jsonb_build_object('order_id', created_order.id, 'amount_cents', created_order.amount_cents, 'currency', created_order.currency, 'existing', false);
end;
$$;

revoke all on function public.create_digital_product_order(uuid, uuid[], text) from public, anon, authenticated;
grant execute on function public.create_digital_product_order(uuid, uuid[], text) to service_role;

create or replace function public.mark_digital_product_order_paid(
  target_order_id uuid,
  target_provider_session_id text,
  target_provider_payment_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed integer;
begin
  update public.digital_product_orders
  set status = 'paid', provider_session_id = target_provider_session_id,
      provider_payment_id = target_provider_payment_id, paid_at = coalesce(paid_at, now())
  where id = target_order_id and status in ('pending', 'paid');
  get diagnostics changed = row_count;
  if changed = 0 then return false; end if;

  update public.digital_product_order_items
  set paid_at = coalesce(paid_at, now())
  where order_id = target_order_id;
  return true;
end;
$$;

revoke all on function public.mark_digital_product_order_paid(uuid, text, text) from public, anon, authenticated;
grant execute on function public.mark_digital_product_order_paid(uuid, text, text) to service_role;
