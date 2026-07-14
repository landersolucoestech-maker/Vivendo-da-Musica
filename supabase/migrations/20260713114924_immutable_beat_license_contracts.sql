alter table public.beat_license_purchases
  add column contract_number text,
  add column license_snapshot jsonb not null default '{}'::jsonb,
  add column document_downloaded_at timestamptz,
  add column document_download_count integer not null default 0;

update public.beat_license_purchases
set contract_number = 'VDM-LIC-' || upper(substr(replace(id::text, '-', ''), 1, 16))
where contract_number is null;

alter table public.beat_license_purchases
  alter column contract_number set not null,
  add constraint beat_license_purchases_contract_number_unique unique (contract_number),
  add constraint beat_license_purchases_document_download_count_check check (document_download_count >= 0);

create or replace function public.issue_beat_licenses_for_paid_order(target_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  paid_order record; item record; purchase_id uuid; new_purchase_id uuid;
begin
  select id, buyer_id, status, provider, provider_payment_id, amount_cents, currency, paid_at
  into paid_order from public.beat_orders where id = target_order_id;
  if paid_order.id is null or paid_order.status <> 'paid' then return; end if;

  for item in
    select boi.*, bl.license_type, bl.name as license_name, bl.is_exclusive,
      bl.usage_rights, bl.deliverables, bl.max_copies,
      b.title as beat_title, b.genre, b.bpm, b.musical_key,
      b.master_file_path, b.stems_file_path
    from public.beat_order_items boi
    join public.beat_licenses bl on bl.id = boi.license_id
    join public.beats b on b.id = boi.beat_id
    where boi.order_id = paid_order.id
  loop
    new_purchase_id := gen_random_uuid();
    insert into public.beat_license_purchases (
      id, order_item_id, beat_id, license_id, buyer_id, producer_id,
      contract_number, license_snapshot, license_document_url, receipt_url
    ) values (
      new_purchase_id, item.id, item.beat_id, item.license_id, paid_order.buyer_id, item.producer_id,
      'VDM-LIC-' || upper(substr(replace(new_purchase_id::text, '-', ''), 1, 16)),
      jsonb_build_object(
        'beat_title', item.beat_title, 'genre', item.genre, 'bpm', item.bpm,
        'musical_key', item.musical_key, 'license_type', item.license_type,
        'license_name', item.license_name, 'is_exclusive', item.is_exclusive,
        'usage_rights', item.usage_rights, 'deliverables', item.deliverables,
        'max_copies', item.max_copies, 'amount_cents', item.amount_cents,
        'currency', item.currency, 'order_id', paid_order.id,
        'provider', paid_order.provider, 'provider_payment_id', paid_order.provider_payment_id,
        'paid_at', paid_order.paid_at
      ), null, null
    ) on conflict (order_item_id) do update set status = 'active'
    returning id into purchase_id;

    if item.master_file_path is not null then
      insert into public.beat_deliveries (purchase_id, file_label, storage_bucket, file_path, expires_at)
      values (purchase_id, 'Master WAV/MP3', 'beat-masters', item.master_file_path, now() + interval '30 days')
      on conflict (purchase_id, storage_bucket, file_path) do nothing;
    end if;
    if item.stems_file_path is not null and item.is_exclusive then
      insert into public.beat_deliveries (purchase_id, file_label, storage_bucket, file_path, expires_at)
      values (purchase_id, 'Stems completos', 'beat-stems', item.stems_file_path, now() + interval '30 days')
      on conflict (purchase_id, storage_bucket, file_path) do nothing;
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
