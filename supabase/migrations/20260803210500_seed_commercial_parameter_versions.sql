begin;

with seed as (
  select *
  from (
    values
      ('financial.default_platform_commission_bps', to_jsonb(coalesce((select default_commission_bps from public.platform_financial_settings where id = true), 0))),
      ('financial.payout_minimum_cents', to_jsonb(coalesce((select payout_minimum_cents from public.platform_financial_settings where id = true), 0))),
      ('financial.payout_delay_days', to_jsonb(coalesce((select payout_delay_days from public.platform_financial_settings where id = true), 0))),
      ('affiliate.default_commission_bps', to_jsonb(1000)),
      ('affiliate.attribution_window_days', to_jsonb(30)),
      ('jobs.credit_validity_days', to_jsonb(180)),
      ('jobs.post_validity_days', to_jsonb(30)),
      ('payments.refund_window_days', to_jsonb(7)),
      ('payments.reserve_bps', to_jsonb(0))
  ) as values_table(key, value)
)
insert into public.commercial_parameter_versions (
  parameter_id,
  version,
  value,
  status,
  effective_from,
  published_at
)
select parameter.id, 1, seed.value, 'published', now(), now()
from seed
join public.commercial_parameters parameter
  on parameter.key = seed.key
 and parameter.scope_type = 'global'
 and parameter.scope_id is null
where not exists (
  select 1
  from public.commercial_parameter_versions version
  where version.parameter_id = parameter.id
);

commit;
