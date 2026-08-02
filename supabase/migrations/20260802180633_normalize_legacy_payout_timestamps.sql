-- Historical payout tables require provider and state-specific timestamps that
-- are not part of the consolidated portal contract. Populate them only when
-- those legacy columns exist.

create or replace function public.normalize_legacy_producer_payout_fields()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.status = 'processing' and new.processing_at is null then
    new.processing_at := coalesce(new.processed_at, now());
  end if;

  if new.status = 'paid' then
    new.processing_at := coalesce(new.processing_at, new.processed_at, now());
    new.paid_at := coalesce(new.paid_at, new.processed_at, now());
    new.provider_transfer_id := coalesce(
      nullif(new.provider_transfer_id, ''),
      'demo-transfer-' || replace(new.id::text, '-', '')
    );
  end if;

  return new;
end;
$$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='producer_payout_requests' and column_name='provider_transfer_id'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='producer_payout_requests' and column_name='paid_at'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='producer_payout_requests' and column_name='processing_at'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='producer_payout_requests' and column_name='processed_at'
  ) then
    drop trigger if exists normalize_legacy_producer_payout_fields_before_write on public.producer_payout_requests;
    create trigger normalize_legacy_producer_payout_fields_before_write
      before insert or update of status, processed_at, processing_at, paid_at, provider_transfer_id
      on public.producer_payout_requests
      for each row execute function public.normalize_legacy_producer_payout_fields();
  end if;
end
$$;

revoke all on function public.normalize_legacy_producer_payout_fields() from public, anon, authenticated;
