-- Volatile RPCs that require authenticated or service execution must not be
-- callable by anon merely because PostgreSQL granted EXECUTE broadly. Preserve
-- explicitly named demo/public-preview RPCs; restrict real administration,
-- authenticated account actions, and operational maintenance routines.

revoke execute on function public.admin_grant_company_credits(uuid, uuid, integer, text) from anon;
revoke execute on function public.admin_publish_commercial_parameter(text, text, text, text, text, jsonb, text, uuid, text, timestamptz) from anon;
revoke execute on function public.admin_set_account_capability(uuid, text, text, boolean) from anon;
revoke execute on function public.admin_upsert_beat_license_template(uuid, text, text, text, text, integer, text, jsonb, jsonb, integer, boolean, boolean, integer) from anon;
revoke execute on function public.admin_upsert_job_credit_pack(uuid, text, text, text, integer, integer, text, integer, boolean, integer) from anon;
revoke execute on function public.get_producer_payout_balance(uuid, text) from anon;
revoke execute on function public.moderate_community_report(uuid, text, text) from anon;
revoke execute on function public.publish_company_opportunity_with_credit(uuid, text, text, text, text, text, text, text[], text[], integer, integer, text, date) from anon;
revoke execute on function public.renew_company_opportunity_with_credit(uuid) from anon;
revoke execute on function public.request_account_capability(text) from anon;

revoke execute on function public.capture_observability_snapshot() from anon, authenticated;
revoke execute on function public.cleanup_observability_data() from anon, authenticated;
revoke execute on function public.consume_api_rate_limit(text, text, integer, integer) from anon, authenticated;
revoke execute on function public.record_api_observation(uuid, uuid, text, text, text, integer, integer, text) from anon, authenticated;
