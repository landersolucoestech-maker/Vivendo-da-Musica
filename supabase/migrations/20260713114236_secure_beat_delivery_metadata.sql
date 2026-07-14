alter table public.beat_deliveries
  add column storage_bucket text,
  add column download_count integer not null default 0;

update public.beat_deliveries
set storage_bucket = case
  when lower(file_label) like '%stem%' then 'beat-stems'
  else 'beat-masters'
end
where storage_bucket is null;

alter table public.beat_deliveries
  alter column storage_bucket set not null,
  add constraint beat_deliveries_storage_bucket_check
    check (storage_bucket in ('beat-masters', 'beat-stems')),
  add constraint beat_deliveries_download_count_check
    check (download_count >= 0),
  add constraint beat_deliveries_purchase_file_unique
    unique (purchase_id, storage_bucket, file_path);

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
      order_item_id, beat_id, license_id, buyer_id, producer_id,
      license_document_url, receipt_url
    )
    values (
      item.id, item.beat_id, item.license_id, paid_order.buyer_id, item.producer_id,
      '/documents/licenses/' || item.id::text || '.pdf',
      '/documents/receipts/' || target_order_id::text || '.pdf'
    )
    on conflict (order_item_id) do update set status = 'active'
    returning id into purchase_id;

    if item.master_file_path is not null then
      insert into public.beat_deliveries (
        purchase_id, file_label, storage_bucket, file_path, expires_at
      )
      values (
        purchase_id, 'Master WAV/MP3', 'beat-masters', item.master_file_path, now() + interval '30 days'
      )
      on conflict (purchase_id, storage_bucket, file_path) do nothing;
    end if;

    if item.stems_file_path is not null and item.is_exclusive then
      insert into public.beat_deliveries (
        purchase_id, file_label, storage_bucket, file_path, expires_at
      )
      values (
        purchase_id, 'Stems completos', 'beat-stems', item.stems_file_path, now() + interval '30 days'
      )
      on conflict (purchase_id, storage_bucket, file_path) do nothing;
    end if;

    insert into public.beat_events (beat_id, user_id, event_type, metadata)
    values (
      item.beat_id, paid_order.buyer_id, 'purchase',
      jsonb_build_object('license_id', item.license_id, 'amount_cents', item.amount_cents)
    );

    if item.is_exclusive then
      update public.beats set exclusive_available = false where id = item.beat_id;
      update public.beat_licenses set available = false where beat_id = item.beat_id;
    end if;
  end loop;
end;
$$;

revoke all on function public.issue_beat_licenses_for_paid_order(uuid) from public;
