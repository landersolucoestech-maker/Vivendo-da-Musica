-- Historical beat orders contain promotion columns that are absent from the
-- current consolidated contract. Keep those totals consistent whenever the
-- legacy columns are present, without adding them to newer databases.

create or replace function public.normalize_legacy_beat_order_totals()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.subtotal_cents = 0
     and new.amount_cents > 0
     and new.discount_cents = 0 then
    new.subtotal_cents := new.amount_cents;
  end if;

  return new;
end;
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'beat_orders'
      and column_name = 'subtotal_cents'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'beat_orders'
      and column_name = 'discount_cents'
  ) then
    drop trigger if exists normalize_legacy_beat_order_totals_before_write on public.beat_orders;
    create trigger normalize_legacy_beat_order_totals_before_write
      before insert or update of amount_cents, subtotal_cents, discount_cents
      on public.beat_orders
      for each row execute function public.normalize_legacy_beat_order_totals();
  end if;
end
$$;

revoke all on function public.normalize_legacy_beat_order_totals() from public, anon, authenticated;
