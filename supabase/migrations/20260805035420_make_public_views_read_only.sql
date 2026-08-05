-- Public balance and preview views are read models. Two of them are
-- automatically updatable by PostgreSQL, so broad default grants could route
-- writes to their base tables. Keep all four views strictly SELECT-only.

revoke insert, update, delete, truncate, references, trigger
on table
  public.beneficiary_balances,
  public.company_credit_balances,
  public.ledger_account_balances,
  public.published_courses_preview
from anon, authenticated, service_role;

grant select
on table
  public.beneficiary_balances,
  public.company_credit_balances,
  public.ledger_account_balances,
  public.published_courses_preview
to anon, authenticated, service_role;
