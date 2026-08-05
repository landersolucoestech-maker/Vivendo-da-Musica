-- REVOKE from anon alone does not remove EXECUTE inherited through PUBLIC.
-- Replace inherited function ACLs with explicit authenticated/service grants.

revoke execute on function public.admin_grant_company_credits(uuid, uuid, integer, text) from public, anon;
revoke execute on function public.admin_publish_commercial_parameter(text, text, text, text, text, jsonb, text, uuid, text, timestamptz) from public, anon;
revoke execute on function public.admin_set_account_capability(uuid, text, text, boolean) from public, anon;
revoke execute on function public.admin_upsert_beat_license_template(uuid, text, text, text, text, integer, text, jsonb, jsonb, integer, boolean, boolean, integer) from public, anon;
revoke execute on function public.admin_upsert_job_credit_pack(uuid, text, text, text, integer, integer, text, integer, boolean, integer) from public, anon;
revoke execute on function public.get_producer_payout_balance(uuid, text) from public, anon;
revoke execute on function public.moderate_community_report(uuid, text, text) from public, anon;
revoke execute on function public.publish_company_opportunity_with_credit(uuid, text, text, text, text, text, text, text[], text[], integer, integer, text, date) from public, anon;
revoke execute on function public.renew_company_opportunity_with_credit(uuid) from public, anon;
revoke execute on function public.request_account_capability(text) from public, anon;

grant execute on function public.admin_grant_company_credits(uuid, uuid, integer, text) to authenticated, service_role;
grant execute on function public.admin_publish_commercial_parameter(text, text, text, text, text, jsonb, text, uuid, text, timestamptz) to authenticated, service_role;
grant execute on function public.admin_set_account_capability(uuid, text, text, boolean) to authenticated, service_role;
grant execute on function public.admin_upsert_beat_license_template(uuid, text, text, text, text, integer, text, jsonb, jsonb, integer, boolean, boolean, integer) to authenticated, service_role;
grant execute on function public.admin_upsert_job_credit_pack(uuid, text, text, text, integer, integer, text, integer, boolean, integer) to authenticated, service_role;
grant execute on function public.get_producer_payout_balance(uuid, text) to authenticated, service_role;
grant execute on function public.moderate_community_report(uuid, text, text) to authenticated, service_role;
grant execute on function public.publish_company_opportunity_with_credit(uuid, text, text, text, text, text, text, text[], text[], integer, integer, text, date) to authenticated, service_role;
grant execute on function public.renew_company_opportunity_with_credit(uuid) to authenticated, service_role;
grant execute on function public.request_account_capability(text) to authenticated, service_role;

revoke execute on function public.capture_observability_snapshot() from public, anon, authenticated;
revoke execute on function public.cleanup_observability_data() from public, anon, authenticated;
revoke execute on function public.consume_api_rate_limit(text, text, integer, integer) from public, anon, authenticated;
revoke execute on function public.record_api_observation(uuid, uuid, text, text, text, integer, integer, text) from public, anon, authenticated;

grant execute on function public.capture_observability_snapshot() to service_role;
grant execute on function public.cleanup_observability_data() to service_role;
grant execute on function public.consume_api_rate_limit(text, text, integer, integer) to service_role;
grant execute on function public.record_api_observation(uuid, uuid, text, text, text, integer, integer, text) to service_role;
