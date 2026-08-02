-- Unified account signup. Only the five public account profiles may be requested
-- through auth metadata; administrative roles remain unavailable to self-signup.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_name text;
  normalized_company_name text;
  normalized_professional_name text;
  normalized_specialty text;
  normalized_portfolio_url text;
  normalized_website_url text;
  normalized_channel_name text;
  normalized_channel_url text;
  requested_role text;
  requested_experience_years integer;
  created_company_id uuid;
begin
  normalized_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  normalized_company_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'company_name', '')), '');
  normalized_professional_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'professional_name', '')), '');
  normalized_specialty := nullif(trim(coalesce(new.raw_user_meta_data ->> 'specialty', '')), '');
  normalized_portfolio_url := nullif(trim(coalesce(new.raw_user_meta_data ->> 'portfolio_url', '')), '');
  normalized_website_url := nullif(trim(coalesce(new.raw_user_meta_data ->> 'website_url', '')), '');
  normalized_channel_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'channel_name', '')), '');
  normalized_channel_url := nullif(trim(coalesce(new.raw_user_meta_data ->> 'channel_url', '')), '');

  requested_role := case lower(trim(coalesce(new.raw_user_meta_data ->> 'account_type', 'student')))
    when 'student' then 'student'
    when 'producer' then 'producer'
    when 'instructor' then 'instructor'
    when 'company' then 'company'
    when 'affiliate' then 'affiliate'
    else 'student'
  end;

  requested_experience_years := case
    when coalesce(new.raw_user_meta_data ->> 'experience_years', '') ~ '^\d{1,2}$'
      then least(80, greatest(0, (new.raw_user_meta_data ->> 'experience_years')::integer))
    else 0
  end;

  insert into public.user_profiles (user_id, full_name, role, is_demo)
  values (
    new.id,
    left(coalesce(normalized_name, split_part(coalesce(new.email, 'Usuário'), '@', 1)), 160),
    requested_role,
    false
  )
  on conflict (user_id) do nothing;

  if requested_role = 'company' then
    insert into public.company_profiles (
      slug,
      owner_user_id,
      display_name,
      legal_name,
      website_url,
      verification_status,
      is_demo
    ) values (
      'empresa-' || left(replace(new.id::text, '-', ''), 12),
      new.id,
      left(coalesce(normalized_company_name, normalized_name, 'Empresa'), 180),
      left(coalesce(normalized_company_name, normalized_name, 'Empresa'), 180),
      normalized_website_url,
      'pending',
      false
    )
    on conflict (owner_user_id) do update
      set display_name = excluded.display_name,
          legal_name = excluded.legal_name,
          website_url = excluded.website_url,
          updated_at = now()
    returning id into created_company_id;

    insert into public.company_members (company_id, user_id, member_role, status)
    values (created_company_id, new.id, 'owner', 'active')
    on conflict (company_id, user_id) do update
      set member_role = 'owner',
          status = 'active',
          updated_at = now();
  else
    insert into public.candidate_profiles (
      user_id,
      headline,
      experience_years,
      skills,
      preferred_roles,
      portfolio_url,
      availability,
      is_demo
    ) values (
      new.id,
      left(coalesce(normalized_professional_name, normalized_channel_name, normalized_specialty, normalized_name), 180),
      requested_experience_years,
      case when normalized_specialty is null then '{}'::text[] else array[normalized_specialty] end,
      array[requested_role],
      coalesce(normalized_portfolio_url, normalized_channel_url),
      'open',
      false
    )
    on conflict (user_id) do update
      set headline = excluded.headline,
          experience_years = excluded.experience_years,
          skills = excluded.skills,
          preferred_roles = excluded.preferred_roles,
          portfolio_url = excluded.portfolio_url,
          updated_at = now();
  end if;

  if requested_role = 'affiliate' then
    insert into public.affiliate_profiles (
      user_id,
      display_name,
      referral_code,
      status,
      is_demo
    ) values (
      new.id,
      left(coalesce(normalized_channel_name, normalized_name, 'Afiliado'), 160),
      'AF-' || upper(left(replace(new.id::text, '-', ''), 10)),
      'active',
      false
    )
    on conflict (user_id) do update
      set display_name = excluded.display_name,
          updated_at = now();
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
grant execute on function public.handle_new_auth_user() to service_role;
