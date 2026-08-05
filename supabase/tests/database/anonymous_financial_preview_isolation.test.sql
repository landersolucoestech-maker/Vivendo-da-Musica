begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

set local role anon;

select is(
  (
    select count(*)::bigint
    from public.beneficiary_balances balance
    left join public.commerce_order_items order_item
      on order_item.id = balance.order_item_id
    left join public.commerce_orders order_row
      on order_row.id = order_item.order_id
    where coalesce(order_row.is_demo, false) = false
  ),
  0::bigint,
  'anonymous beneficiary balances contain demo orders only'
);

select is(
  (
    select count(*)::bigint
    from public.company_credit_balances balance
    left join public.company_profiles company
      on company.id = balance.company_id
    where coalesce(company.is_demo, false) = false
  ),
  0::bigint,
  'anonymous company credit balances contain demo companies only'
);

select is(
  (select count(*)::bigint from public.ledger_account_balances),
  0::bigint,
  'anonymous users cannot read ledger account balances'
);

reset role;
select * from finish();
rollback;
