begin;

alter function public.publish_company_opportunity_with_credit(
  uuid, text, text, text, text, text, text, text[], text[], integer, integer, text, date
) set schema app_private;

alter function public.renew_company_opportunity_with_credit(uuid)
  set schema app_private;

alter function public.admin_publish_demo_commercial_parameter(uuid, jsonb, timestamptz)
  set schema app_private;

alter function public.admin_update_demo_job_credit_pack(
  uuid, text, text, integer, integer, text, integer, boolean, integer
) set schema app_private;

alter function public.admin_update_demo_beat_license_template(
  uuid, text, text, integer, text, jsonb, jsonb, integer, boolean, integer
) set schema app_private;

create or replace function public.publish_company_opportunity_with_credit(
  target_company_id uuid,
  target_kind text,
  target_title text,
  target_location text,
  target_engagement_type text,
  target_work_mode text,
  target_description text,
  target_requirements text[],
  target_benefits text[],
  target_salary_min_cents integer,
  target_salary_max_cents integer,
  target_currency text,
  target_application_deadline date
)
returns public.opportunities
language sql
security invoker
set search_path = public, app_private, pg_temp
as $$
  select app_private.publish_company_opportunity_with_credit(
    target_company_id,
    target_kind,
    target_title,
    target_location,
    target_engagement_type,
    target_work_mode,
    target_description,
    target_requirements,
    target_benefits,
    target_salary_min_cents,
    target_salary_max_cents,
    target_currency,
    target_application_deadline
  );
$$;

create or replace function public.renew_company_opportunity_with_credit(
  target_opportunity_id uuid
)
returns public.opportunities
language sql
security invoker
set search_path = public, app_private, pg_temp
as $$
  select app_private.renew_company_opportunity_with_credit(target_opportunity_id);
$$;

create or replace function public.admin_publish_demo_commercial_parameter(
  target_parameter_id uuid,
  target_value jsonb,
  target_effective_from timestamptz default now()
)
returns public.commercial_parameter_versions
language sql
security invoker
set search_path = public, app_private, pg_temp
as $$
  select app_private.admin_publish_demo_commercial_parameter(
    target_parameter_id,
    target_value,
    target_effective_from
  );
$$;

create or replace function public.admin_update_demo_job_credit_pack(
  target_pack_id uuid,
  target_name text,
  target_description text,
  target_credit_quantity integer,
  target_price_cents integer,
  target_currency text,
  target_validity_days integer,
  target_active boolean,
  target_sort_order integer
)
returns public.job_credit_packs
language sql
security invoker
set search_path = public, app_private, pg_temp
as $$
  select app_private.admin_update_demo_job_credit_pack(
    target_pack_id,
    target_name,
    target_description,
    target_credit_quantity,
    target_price_cents,
    target_currency,
    target_validity_days,
    target_active,
    target_sort_order
  );
$$;

create or replace function public.admin_update_demo_beat_license_template(
  target_template_id uuid,
  target_name text,
  target_description text,
  target_price_cents integer,
  target_currency text,
  target_deliverables jsonb,
  target_usage_rights jsonb,
  target_max_copies integer,
  target_active boolean,
  target_sort_order integer
)
returns public.beat_license_templates
language sql
security invoker
set search_path = public, app_private, pg_temp
as $$
  select app_private.admin_update_demo_beat_license_template(
    target_template_id,
    target_name,
    target_description,
    target_price_cents,
    target_currency,
    target_deliverables,
    target_usage_rights,
    target_max_copies,
    target_active,
    target_sort_order
  );
$$;

grant usage on schema app_private to anon, authenticated, service_role;

revoke all on function app_private.publish_company_opportunity_with_credit(
  uuid, text, text, text, text, text, text, text[], text[], integer, integer, text, date
) from public;
grant execute on function app_private.publish_company_opportunity_with_credit(
  uuid, text, text, text, text, text, text, text[], text[], integer, integer, text, date
) to anon, authenticated, service_role;

revoke all on function app_private.renew_company_opportunity_with_credit(uuid) from public;
grant execute on function app_private.renew_company_opportunity_with_credit(uuid)
  to anon, authenticated, service_role;

revoke all on function app_private.admin_publish_demo_commercial_parameter(uuid, jsonb, timestamptz) from public;
grant execute on function app_private.admin_publish_demo_commercial_parameter(uuid, jsonb, timestamptz)
  to anon, authenticated, service_role;

revoke all on function app_private.admin_update_demo_job_credit_pack(
  uuid, text, text, integer, integer, text, integer, boolean, integer
) from public;
grant execute on function app_private.admin_update_demo_job_credit_pack(
  uuid, text, text, integer, integer, text, integer, boolean, integer
) to anon, authenticated, service_role;

revoke all on function app_private.admin_update_demo_beat_license_template(
  uuid, text, text, integer, text, jsonb, jsonb, integer, boolean, integer
) from public;
grant execute on function app_private.admin_update_demo_beat_license_template(
  uuid, text, text, integer, text, jsonb, jsonb, integer, boolean, integer
) to anon, authenticated, service_role;

revoke all on function public.publish_company_opportunity_with_credit(
  uuid, text, text, text, text, text, text, text[], text[], integer, integer, text, date
) from public;
grant execute on function public.publish_company_opportunity_with_credit(
  uuid, text, text, text, text, text, text, text[], text[], integer, integer, text, date
) to anon, authenticated, service_role;

revoke all on function public.renew_company_opportunity_with_credit(uuid) from public;
grant execute on function public.renew_company_opportunity_with_credit(uuid)
  to anon, authenticated, service_role;

revoke all on function public.admin_publish_demo_commercial_parameter(uuid, jsonb, timestamptz) from public;
grant execute on function public.admin_publish_demo_commercial_parameter(uuid, jsonb, timestamptz)
  to anon, authenticated, service_role;

revoke all on function public.admin_update_demo_job_credit_pack(
  uuid, text, text, integer, integer, text, integer, boolean, integer
) from public;
grant execute on function public.admin_update_demo_job_credit_pack(
  uuid, text, text, integer, integer, text, integer, boolean, integer
) to anon, authenticated, service_role;

revoke all on function public.admin_update_demo_beat_license_template(
  uuid, text, text, integer, text, jsonb, jsonb, integer, boolean, integer
) from public;
grant execute on function public.admin_update_demo_beat_license_template(
  uuid, text, text, integer, text, jsonb, jsonb, integer, boolean, integer
) to anon, authenticated, service_role;

commit;
