-- Remove anonymous SELECT grants that have no matching RLS policy and are not
-- required by an anonymous RPC or an anonymous security-invoker view.

revoke select on table
  public.affiliate_referrals,
  public.affiliates,
  public.api_idempotency_keys,
  public.api_rate_limit_windows,
  public.beat_copyright_evidence,
  public.cms_revisions,
  public.community_moderation_actions,
  public.event_certificates,
  public.event_registrations,
  public.event_streams,
  public.financial_accounts,
  public.financial_reversal_events,
  public.ledger_entries,
  public.ledger_transactions,
  public.observability_alerts,
  public.payment_reconciliation_items,
  public.payment_reconciliation_reports,
  public.payment_reconciliation_runs,
  public.payment_webhook_events,
  public.producer_commission_overrides,
  public.service_moderation_events,
  public.webhook_receipts
from public, anon;
