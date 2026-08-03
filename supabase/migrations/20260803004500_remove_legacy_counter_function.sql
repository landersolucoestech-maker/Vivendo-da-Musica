-- The active trigger now uses the private, revoked implementation created by
-- 20260803003000. Remove the legacy public security-definer function after
-- confirming it no longer owns a trigger.

drop function if exists public.sync_opportunity_application_count();
