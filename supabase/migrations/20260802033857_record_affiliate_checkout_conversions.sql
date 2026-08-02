create unique index if not exists affiliate_conversions_order_id_uidx
  on public.affiliate_conversions(order_id)
  where order_id is not null;

create or replace function app_private.record_affiliate_checkout_conversion(
  target_order_id uuid,
  target_order_kind text,
  target_referral_slug text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  link_row public.affiliate_links%rowtype;
  profile_row public.affiliate_profiles%rowtype;
  gross_cents bigint;
  calculated_commission bigint;
  conversion_id uuid;
begin
  if target_referral_slug is null or trim(target_referral_slug) = '' then
    return null;
  end if;

  select * into link_row
  from public.affiliate_links
  where slug = lower(trim(target_referral_slug))
    and active = true
  for update;

  if not found then
    return null;
  end if;

  select * into profile_row
  from public.affiliate_profiles
  where id = link_row.affiliate_id
    and status = 'active'
  for update;

  if not found then
    return null;
  end if;

  case target_order_kind
    when 'course' then
      select amount_cents into gross_cents
      from public.course_orders
      where id = target_order_id and status = 'paid';
    when 'beat' then
      select amount_cents into gross_cents
      from public.beat_orders
      where id = target_order_id and status = 'paid';
    when 'digital_product' then
      select amount_cents into gross_cents
      from public.digital_product_orders
      where id = target_order_id and status = 'paid';
    else
      raise exception 'Tipo de pedido inválido.' using errcode = '22023';
  end case;

  if gross_cents is null or gross_cents <= 0 then
    return null;
  end if;

  select id into conversion_id
  from public.affiliate_conversions
  where order_id = target_order_id;

  if conversion_id is not null then
    return conversion_id;
  end if;

  calculated_commission := round(gross_cents * profile_row.commission_rate / 100.0);
  if calculated_commission <= 0 then
    return null;
  end if;

  insert into public.affiliate_conversions (
    affiliate_id,
    affiliate_link_id,
    order_id,
    customer_reference,
    gross_amount_cents,
    commission_amount_cents,
    status,
    converted_at,
    approved_at
  ) values (
    profile_row.id,
    link_row.id,
    target_order_id,
    target_order_kind,
    gross_cents,
    calculated_commission,
    'approved',
    now(),
    now()
  ) returning id into conversion_id;

  insert into public.affiliate_commissions (
    affiliate_id,
    conversion_id,
    amount_cents,
    status,
    available_at
  ) values (
    profile_row.id,
    conversion_id,
    calculated_commission,
    'available',
    now()
  );

  update public.affiliate_profiles
  set balance_cents = balance_cents + calculated_commission,
      lifetime_earnings_cents = lifetime_earnings_cents + calculated_commission,
      updated_at = now()
  where id = profile_row.id;

  update public.affiliate_links
  set conversions_count = conversions_count + 1,
      updated_at = now()
  where id = link_row.id;

  return conversion_id;
end;
$$;

revoke all on function app_private.record_affiliate_checkout_conversion(uuid,text,text) from public, anon, authenticated;
grant execute on function app_private.record_affiliate_checkout_conversion(uuid,text,text) to service_role;
