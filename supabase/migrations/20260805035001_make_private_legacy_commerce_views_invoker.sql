-- Legacy commerce reconciliation views are service-only, but should still
-- execute with caller privileges. This prevents future privilege escalation if
-- their SELECT grants are ever broadened accidentally.

alter view app_private.legacy_commerce_orders
  set (security_invoker = true);

alter view app_private.legacy_commerce_order_items
  set (security_invoker = true);
