create or replace function app_private.sync_legacy_commerce_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb := to_jsonb(new);
  target_kind text;
  target_id uuid;
begin
  target_kind := case
    when tg_table_name in ('course_orders', 'course_order_items') then 'course'
    when tg_table_name in ('digital_product_orders', 'digital_product_order_items') then 'digital_product'
    when tg_table_name in ('beat_orders', 'beat_order_items') then 'beat'
    else null
  end;

  if target_kind is null then
    raise exception 'Unsupported legacy commerce trigger table: %', tg_table_name
      using errcode = '0A000';
  end if;

  if tg_table_name in ('course_orders', 'digital_product_orders', 'beat_orders') then
    target_id := nullif(row_data ->> 'id', '')::uuid;
  else
    target_id := nullif(row_data ->> 'order_id', '')::uuid;
  end if;

  if target_id is null then
    raise exception 'Legacy commerce trigger could not resolve an order id for table %', tg_table_name
      using errcode = '23502';
  end if;

  perform app_private.sync_legacy_commerce_order(target_kind, target_id);
  return new;
end;
$$;

revoke all on function app_private.sync_legacy_commerce_trigger() from public, anon, authenticated, service_role;
grant execute on function app_private.sync_legacy_commerce_trigger() to postgres;

comment on function app_private.sync_legacy_commerce_trigger()
is 'Synchronizes legacy commerce rows without dereferencing fields that do not exist on the triggering record.';
