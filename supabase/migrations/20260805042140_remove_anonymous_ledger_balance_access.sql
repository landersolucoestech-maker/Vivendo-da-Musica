-- The anonymous ledger balance view returned no rows and did not support a
-- preview flow. Remove its SELECT grant and the underlying grants required only
-- for that view, while preserving authenticated and service access.

revoke select on table public.ledger_account_balances from public, anon;
revoke select on table public.ledger_accounts from public, anon;
revoke select on table public.ledger_postings from public, anon;
