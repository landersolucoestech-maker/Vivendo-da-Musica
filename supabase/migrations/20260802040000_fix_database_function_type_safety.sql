-- Resolve the remaining function type-safety issues reported by the database
-- lint while preserving compatibility between the historical enum-backed schema
-- and the current Supabase development branch, which stores payout status as text.

create or replace function app_private.transition_producer_payout(
  target_request_id uuid,
  target_status text
)
returns public.producer_payout_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  request_row public.producer_payout_requests%rowtype;
  account_row public.producer_financial_accounts%rowtype;
  normalized_status text := lower(trim(target_status));
  status_type_sql text;
begin
  if actor_id is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  if not public.is_platform_staff() then
    raise exception 'Apenas a equipe financeira pode alterar repasses.' using errcode = '42501';
  end if;

  if normalized_status not in ('processing', 'paid', 'failed', 'canceled') then
    raise exception 'Status de repasse inválido.' using errcode = '22023';
  end if;

  select format('%I.%I', type_schema.nspname, type_row.typname)
  into status_type_sql
  from pg_attribute attribute_row
  join pg_class table_row on table_row.oid = attribute_row.attrelid
  join pg_namespace table_schema on table_schema.oid = table_row.relnamespace
  join pg_type type_row on type_row.oid = attribute_row.atttypid
  join pg_namespace type_schema on type_schema.oid = type_row.typnamespace
  where table_schema.nspname = 'public'
    and table_row.relname = 'producer_payout_requests'
    and attribute_row.attname = 'status'
    and not attribute_row.attisdropped;

  if status_type_sql is null then
    raise exception 'Tipo da situação do repasse não encontrado.' using errcode = 'P0002';
  end if;

  select * into request_row
  from public.producer_payout_requests
  where id = target_request_id
  for update;

  if not found then
    raise exception 'Solicitação de repasse não encontrada.' using errcode = 'P0002';
  end if;

  if request_row.status::text in ('paid', 'failed', 'canceled') then
    raise exception 'Repasse já está em estado terminal.' using errcode = '22023';
  end if;

  if request_row.status::text = 'requested'
     and normalized_status not in ('processing', 'failed', 'canceled') then
    raise exception 'Transição de repasse inválida.' using errcode = '22023';
  end if;

  if request_row.status::text = 'processing'
     and normalized_status not in ('paid', 'failed', 'canceled') then
    raise exception 'Transição de repasse inválida.' using errcode = '22023';
  end if;

  if normalized_status in ('failed', 'canceled') then
    select * into account_row
    from public.producer_financial_accounts
    where producer_id = request_row.producer_id
    for update;

    if not found then
      raise exception 'Conta financeira do produtor não encontrada.' using errcode = 'P0002';
    end if;

    if upper(account_row.currency) is distinct from upper(request_row.currency) then
      raise exception 'Moeda da conta financeira divergente.' using errcode = '22023';
    end if;

    update public.producer_financial_accounts
    set current_balance_cents = current_balance_cents + request_row.amount_cents,
        eligible_balance_cents = eligible_balance_cents + request_row.amount_cents,
        updated_at = now()
    where id = account_row.id;
  end if;

  execute format(
    'update public.producer_payout_requests
       set status = $1::%s,
           processed_at = case
             when $1 in (''paid'', ''failed'', ''canceled'') then now()
             else null
           end
     where id = $2
     returning *',
    status_type_sql
  )
  into request_row
  using normalized_status, request_row.id;

  return request_row;
end;
$$;

create or replace function app_private.transition_demo_producer_payout(
  target_request_id uuid,
  target_status text
)
returns public.producer_payout_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  demo_producer_id constant uuid := '22222222-2222-4222-8222-222222222222'::uuid;
  request_row public.producer_payout_requests%rowtype;
  account_row public.producer_financial_accounts%rowtype;
  normalized_status text := lower(trim(target_status));
  status_type_sql text;
begin
  if normalized_status not in ('processing', 'paid', 'failed', 'canceled') then
    raise exception 'Status de repasse inválido.' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.user_profiles
    where user_id = demo_producer_id
      and role::text = 'producer'
      and is_demo = true
  ) then
    raise exception 'Produtor de demonstração indisponível.' using errcode = 'P0002';
  end if;

  select format('%I.%I', type_schema.nspname, type_row.typname)
  into status_type_sql
  from pg_attribute attribute_row
  join pg_class table_row on table_row.oid = attribute_row.attrelid
  join pg_namespace table_schema on table_schema.oid = table_row.relnamespace
  join pg_type type_row on type_row.oid = attribute_row.atttypid
  join pg_namespace type_schema on type_schema.oid = type_row.typnamespace
  where table_schema.nspname = 'public'
    and table_row.relname = 'producer_payout_requests'
    and attribute_row.attname = 'status'
    and not attribute_row.attisdropped;

  if status_type_sql is null then
    raise exception 'Tipo da situação do repasse não encontrado.' using errcode = 'P0002';
  end if;

  select * into request_row
  from public.producer_payout_requests
  where id = target_request_id
    and producer_id = demo_producer_id
  for update;

  if not found then
    raise exception 'Solicitação de repasse de demonstração não encontrada.' using errcode = 'P0002';
  end if;

  if request_row.status::text in ('paid', 'failed', 'canceled') then
    raise exception 'Repasse já está em estado terminal.' using errcode = '22023';
  end if;

  if request_row.status::text = 'requested'
     and normalized_status not in ('processing', 'failed', 'canceled') then
    raise exception 'Transição de repasse inválida.' using errcode = '22023';
  end if;

  if request_row.status::text = 'processing'
     and normalized_status not in ('paid', 'failed', 'canceled') then
    raise exception 'Transição de repasse inválida.' using errcode = '22023';
  end if;

  if normalized_status in ('failed', 'canceled') then
    select * into account_row
    from public.producer_financial_accounts
    where producer_id = demo_producer_id
    for update;

    if not found then
      raise exception 'Conta financeira de demonstração não encontrada.' using errcode = 'P0002';
    end if;

    if upper(account_row.currency) is distinct from upper(request_row.currency) then
      raise exception 'Moeda da conta financeira divergente.' using errcode = '22023';
    end if;

    update public.producer_financial_accounts
    set current_balance_cents = current_balance_cents + request_row.amount_cents,
        eligible_balance_cents = eligible_balance_cents + request_row.amount_cents,
        updated_at = now()
    where id = account_row.id;
  end if;

  execute format(
    'update public.producer_payout_requests
       set status = $1::%s,
           processed_at = case
             when $1 in (''paid'', ''failed'', ''canceled'') then now()
             else null
           end
     where id = $2
     returning *',
    status_type_sql
  )
  into request_row
  using normalized_status, request_row.id;

  return request_row;
end;
$$;

-- The historical beat marketplace function remains in clean rebuilds, but the
-- modern remote schema no longer exposes its legacy columns. Replace it only
-- when the legacy contract is actually present.
do $migration$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'beat_license_purchases'
      and column_name = 'order_item_id'
  )
  and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'beat_license_purchases'
      and column_name = 'producer_id'
  )
  and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'beat_deliveries'
      and column_name = 'file_path'
  ) then
    execute $function_ddl$
      create or replace function public.issue_beat_licenses_for_paid_order(target_order_id uuid)
      returns void
      language plpgsql
      security definer
      set search_path = public
      as $function_body$
      declare
        paid_order record;
        item record;
        issued_purchase_id uuid;
      begin
        select id, buyer_id, status
        into paid_order
        from public.beat_orders
        where id = target_order_id;

        if paid_order.id is null or paid_order.status::text <> 'paid' then
          return;
        end if;

        for item in
          select order_item.*, license.is_exclusive, license.deliverables,
                 beat.master_file_path, beat.stems_file_path
          from public.beat_order_items order_item
          join public.beat_licenses license on license.id = order_item.license_id
          join public.beats beat on beat.id = order_item.beat_id
          where order_item.order_id = paid_order.id
        loop
          insert into public.beat_license_purchases (
            order_item_id,
            beat_order_item_id,
            beat_id,
            license_id,
            buyer_id,
            producer_id,
            contract_number,
            license_document_url,
            receipt_url
          )
          values (
            item.id,
            item.id,
            item.beat_id,
            item.license_id,
            paid_order.buyer_id,
            item.producer_id,
            'VDM-BEAT-' || upper(substr(replace(item.id::text, '-', ''), 1, 16)),
            '/documents/licenses/' || item.id::text || '.pdf',
            '/documents/receipts/' || target_order_id::text || '.pdf'
          )
          on conflict (order_item_id) do update
            set status = 'active'
          returning id into issued_purchase_id;

          if item.master_file_path is not null then
            insert into public.beat_deliveries (
              purchase_id,
              file_label,
              file_path,
              storage_bucket,
              storage_path,
              expires_at
            )
            values (
              issued_purchase_id,
              'Master WAV/MP3',
              item.master_file_path,
              'beat-masters',
              item.master_file_path,
              now() + interval '30 days'
            )
            on conflict do nothing;
          end if;

          if item.stems_file_path is not null and item.is_exclusive then
            insert into public.beat_deliveries (
              purchase_id,
              file_label,
              file_path,
              storage_bucket,
              storage_path,
              expires_at
            )
            values (
              issued_purchase_id,
              'Stems completos',
              item.stems_file_path,
              'beat-stems',
              item.stems_file_path,
              now() + interval '30 days'
            )
            on conflict do nothing;
          end if;

          insert into public.beat_events (beat_id, user_id, event_type, metadata)
          values (
            item.beat_id,
            paid_order.buyer_id,
            'purchase',
            jsonb_build_object(
              'license_id', item.license_id,
              'amount_cents', item.amount_cents
            )
          );

          if item.is_exclusive then
            update public.beats
            set exclusive_available = false
            where id = item.beat_id;

            update public.beat_licenses
            set available = false
            where beat_id = item.beat_id;
          end if;
        end loop;
      end;
      $function_body$
    $function_ddl$;
  end if;
end
$migration$;

-- The historical reversal function returns enum values. Explicit casts remove
-- plpgsql_check warnings without changing any state transition or ledger rule.
do $migration$
begin
  if to_regprocedure(
    'public.reverse_beat_order_ledger(uuid,public.ledger_event_type,text,bigint,text,text)'
  ) is not null then
    execute $function_ddl$
      create or replace function public.reverse_beat_order_ledger(
        target_order_id uuid,
        reversal_kind public.ledger_event_type,
        provider_event text,
        reversal_amount_cents bigint,
        reversal_currency text,
        reversal_reason text default null
      )
      returns public.financial_reversal_status
      language plpgsql
      security definer
      set search_path = public
      as $function_body$
      declare
        target_order record;
        original_transaction record;
        reversal_transaction_id uuid;
        resulting_status public.financial_reversal_status;
      begin
        if reversal_kind not in ('refund', 'chargeback') then
          raise exception 'Invalid reversal event type';
        end if;

        select id, status, amount_cents, currency, financial_state
        into target_order
        from public.beat_orders
        where id = target_order_id
        for update;

        if target_order.id is null then
          raise exception 'Beat order not found';
        end if;

        if upper(reversal_currency) <> target_order.currency then
          raise exception 'Reversal currency mismatch';
        end if;

        if exists (
          select 1
          from public.financial_reversal_events
          where provider_event_id = provider_event
        ) then
          return (
            select status
            from public.financial_reversal_events
            where provider_event_id = provider_event
          );
        end if;

        if reversal_amount_cents <> target_order.amount_cents then
          insert into public.financial_reversal_events (
            provider_event_id,
            order_id,
            event_type,
            amount_cents,
            currency,
            status,
            reason
          )
          values (
            provider_event,
            target_order.id,
            reversal_kind,
            reversal_amount_cents,
            target_order.currency,
            'manual_review',
            reversal_reason
          );

          return 'manual_review'::public.financial_reversal_status;
        end if;

        if target_order.financial_state in ('refunded', 'disputed') then
          insert into public.financial_reversal_events (
            provider_event_id,
            order_id,
            event_type,
            amount_cents,
            currency,
            status,
            reason
          )
          values (
            provider_event,
            target_order.id,
            reversal_kind,
            reversal_amount_cents,
            target_order.currency,
            'ignored',
            'Order already reversed'
          );

          return 'ignored'::public.financial_reversal_status;
        end if;

        for original_transaction in
          select *
          from public.ledger_transactions
          where event_type = 'beat_sale'
            and reference_type = 'beat_order'
            and reference_id = target_order.id
        loop
          insert into public.ledger_transactions (
            event_type,
            reference_type,
            reference_id,
            idempotency_key,
            commission_bps,
            description,
            metadata,
            occurred_at
          )
          values (
            reversal_kind,
            'beat_order',
            target_order.id,
            reversal_kind::text || ':' || provider_event || ':' || original_transaction.id::text,
            original_transaction.commission_bps,
            case
              when reversal_kind = 'refund' then 'Reembolso integral de venda de beat'
              else 'Chargeback integral de venda de beat'
            end,
            jsonb_build_object(
              'original_transaction_id', original_transaction.id,
              'provider_event_id', provider_event,
              'reason', reversal_reason
            ),
            now()
          )
          returning id into reversal_transaction_id;

          insert into public.ledger_entries (transaction_id, account_id, amount_cents)
          select reversal_transaction_id, account_id, -amount_cents
          from public.ledger_entries
          where transaction_id = original_transaction.id;
        end loop;

        if reversal_kind = 'refund' then
          update public.beat_orders
          set status = 'refunded',
              financial_state = 'refunded'
          where id = target_order.id;

          update public.beat_license_purchases
          set status = 'refunded'
          where order_item_id in (
            select id
            from public.beat_order_items
            where order_id = target_order.id
          );
        else
          update public.beat_orders
          set financial_state = 'disputed'
          where id = target_order.id;

          update public.beat_license_purchases
          set status = 'revoked'
          where order_item_id in (
            select id
            from public.beat_order_items
            where order_id = target_order.id
          );
        end if;

        resulting_status := 'processed';

        insert into public.financial_reversal_events (
          provider_event_id,
          order_id,
          event_type,
          amount_cents,
          currency,
          status,
          reason,
          processed_at
        )
        values (
          provider_event,
          target_order.id,
          reversal_kind,
          reversal_amount_cents,
          target_order.currency,
          resulting_status,
          reversal_reason,
          now()
        );

        return resulting_status;
      end;
      $function_body$
    $function_ddl$;
  end if;
end
$migration$;
