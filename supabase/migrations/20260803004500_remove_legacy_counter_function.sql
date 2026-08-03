-- The active trigger now uses the private, revoked implementation created by
-- 20260803003000. Historical databases may still retain the legacy trigger
-- with the same function name, so detach it before removing the public
-- security-definer function.

drop trigger if exists sync_opportunity_application_count
on public.opportunity_applications;

drop function if exists public.sync_opportunity_application_count();
