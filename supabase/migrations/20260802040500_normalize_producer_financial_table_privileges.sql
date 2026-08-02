-- Producer financial state is readable through RLS, but all mutations must pass
-- through the validated payout RPCs. Historical rebuilds revoked the implicit
-- table grants, while the current Supabase branch retained broader grants.
-- Normalize both environments to the same least-privilege contract.

revoke insert, update, delete
on table
  public.producer_financial_accounts,
  public.producer_payout_methods,
  public.producer_payout_requests
from anon, authenticated;

grant select
on table
  public.producer_financial_accounts,
  public.producer_payout_methods,
  public.producer_payout_requests
to anon, authenticated;
