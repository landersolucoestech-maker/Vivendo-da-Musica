begin;

drop policy if exists job_credit_packs_public_read on public.job_credit_packs;
create policy job_credit_packs_public_read
on public.job_credit_packs
for select
to anon
using (active or is_demo);

drop policy if exists beat_license_templates_public_read on public.beat_license_templates;
create policy beat_license_templates_public_read
on public.beat_license_templates
for select
to anon
using (active or is_demo);

drop policy if exists commercial_parameters_public_read on public.commercial_parameters;
create policy commercial_parameters_public_read
on public.commercial_parameters
for select
to anon
using (
  status = 'active'
  and (visibility = 'public' or is_demo)
);

drop policy if exists commercial_parameter_versions_public_read on public.commercial_parameter_versions;
create policy commercial_parameter_versions_public_read
on public.commercial_parameter_versions
for select
to anon
using (
  status = 'published'
  and effective_from <= now()
  and (effective_until is null or effective_until > now())
  and exists (
    select 1
    from public.commercial_parameters parameter
    where parameter.id = parameter_id
      and parameter.status = 'active'
      and (parameter.visibility = 'public' or parameter.is_demo)
  )
);

commit;
