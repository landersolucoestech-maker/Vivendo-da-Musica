create or replace function app_private.resolve_affiliate_referral(target_slug text)
returns table(destination_url text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_slug text := lower(trim(target_slug));
  resolved_url text;
begin
  if normalized_slug !~ '^[a-z0-9][a-z0-9-]{2,79}$' then
    raise exception 'Link de afiliado inválido.' using errcode = '22023';
  end if;

  update public.affiliate_links
  set clicks_count = clicks_count + 1,
      updated_at = now()
  where slug = normalized_slug
    and active = true
  returning affiliate_links.destination_url into resolved_url;

  if resolved_url is null then
    raise exception 'Link de afiliado não encontrado.' using errcode = 'P0002';
  end if;

  if not (
    (resolved_url like '/%' and resolved_url not like '//%')
    or resolved_url ~ '^https://[A-Za-z0-9.-]+(?::[0-9]{1,5})?(?:/|$)'
  ) then
    raise exception 'Destino do link de afiliado não autorizado.' using errcode = '22023';
  end if;

  return query select resolved_url;
end;
$$;

create or replace function public.resolve_affiliate_referral(target_slug text)
returns table(destination_url text)
language sql
security invoker
set search_path = public, app_private, pg_temp
as $$
  select * from app_private.resolve_affiliate_referral(target_slug);
$$;

revoke all on function app_private.resolve_affiliate_referral(text) from public;
grant execute on function app_private.resolve_affiliate_referral(text) to anon, authenticated, service_role;
revoke all on function public.resolve_affiliate_referral(text) from public;
grant execute on function public.resolve_affiliate_referral(text) to anon, authenticated, service_role;
