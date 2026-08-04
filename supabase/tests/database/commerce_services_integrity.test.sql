begin;

select plan(18);

select has_table('public', 'commerce_orders', 'commerce_orders exists');
select has_table('public', 'commerce_order_items', 'commerce_order_items exists');
select has_table('public', 'payments', 'payments exists');
select has_table('public', 'ledger_transactions', 'ledger_transactions exists');
select has_table('public', 'ledger_postings', 'ledger_postings exists');
select has_table('public', 'service_listings', 'service_listings exists');
select has_table('public', 'service_contracts', 'service_contracts exists');
select has_table('public', 'company_credit_lots', 'company_credit_lots exists');

select is(
  (
    select count(*)::bigint
    from (
      select transaction_id
      from public.ledger_postings
      group by transaction_id
      having sum(case when direction = 'debit' then amount_cents else -amount_cents end) <> 0
    ) imbalance
  ),
  0::bigint,
  'all ledger transactions are balanced'
);

select ok(
  not exists (
    select 1
    from public.commercial_parameters parameter
    where parameter.status = 'active'
      and not exists (
        select 1
        from public.commercial_parameter_versions version
        where version.parameter_id = parameter.id
          and version.status = 'published'
          and version.effective_from <= now()
          and (version.effective_until is null or version.effective_until > now())
      )
  ),
  'every active commercial parameter has a currently published version'
);

select is(
  (
    select count(*)::bigint
    from public.job_credit_packs pack
    where pack.active
      and not exists (
        select 1
        from public.commerce_offers offer
        where offer.resource_type = 'job_credit_pack'
          and offer.resource_id = pack.id
          and offer.status = 'active'
      )
  ),
  0::bigint,
  'every active job credit pack has an active canonical offer'
);

select is(
  (
    select count(*)::bigint
    from public.service_packages package
    join public.service_listings listing on listing.id = package.listing_id
    where package.active
      and listing.status = 'published'
      and listing.moderation_status = 'approved'
      and not exists (
        select 1
        from public.commerce_offers offer
        where offer.resource_type = 'service'
          and offer.resource_id = package.id
          and offer.status = 'active'
      )
  ),
  0::bigint,
  'every published service package has an active canonical offer'
);

select is((select public from storage.buckets where id = 'lesson-videos'), false, 'lesson video bucket remains private');
select is((select public from storage.buckets where id = 'service-deliveries'), false, 'service delivery bucket remains private');

select is(
  (
    select count(*)::bigint
    from pg_class table_class
    join pg_namespace namespace on namespace.oid = table_class.relnamespace
    where namespace.nspname = 'public'
      and table_class.relkind = 'r'
      and table_class.relname in (
        'commerce_orders', 'commerce_order_items', 'payments', 'payment_adjustments',
        'revenue_splits', 'payout_requests', 'service_listings', 'service_contracts',
        'service_milestones', 'service_deliveries', 'service_disputes',
        'company_credit_lots', 'company_credit_events', 'account_capabilities'
      )
      and not table_class.relrowsecurity
  ),
  0::bigint,
  'all sensitive commerce tables have RLS enabled'
);

select is(
  (
    select count(*)::bigint
    from pg_proc function_proc
    join pg_namespace namespace on namespace.oid = function_proc.pronamespace
    where namespace.nspname = 'public'
      and function_proc.prosecdef
      and (
        has_function_privilege('anon', function_proc.oid, 'EXECUTE')
        or has_function_privilege('authenticated', function_proc.oid, 'EXECUTE')
      )
  ),
  0::bigint,
  'no public SECURITY DEFINER function is executable by client roles'
);

select is(
  (
    select count(*)::bigint
    from public.commerce_entitlements entitlement
    where entitlement.status = 'active'
      and entitlement.order_id is not null
      and not exists (
        select 1
        from public.commerce_orders orders
        where orders.id = entitlement.order_id
          and orders.status in ('paid', 'partially_refunded', 'chargeback')
      )
  ),
  0::bigint,
  'active paid entitlements reference a financially confirmed order'
);

select is(
  (
    select count(*)::bigint
    from public.company_credit_lots lot
    where lot.source_order_id is not null
      and not exists (
        select 1
        from public.commerce_orders orders
        where orders.id = lot.source_order_id
          and orders.status = 'paid'
      )
  ),
  0::bigint,
  'purchased job credit lots reference paid canonical orders'
);

select * from finish();
rollback;
