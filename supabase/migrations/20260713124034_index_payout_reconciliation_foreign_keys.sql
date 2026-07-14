create index producer_payout_requests_method_idx
  on public.producer_payout_requests (payout_method_id);
create index payment_reconciliation_runs_created_by_idx
  on public.payment_reconciliation_runs (created_by) where created_by is not null;
create index payment_reconciliation_items_report_idx
  on public.payment_reconciliation_items (report_id);
create index payment_reconciliation_items_order_idx
  on public.payment_reconciliation_items (order_id) where order_id is not null;
