alter table public.affiliate_links
  drop constraint if exists affiliate_links_destination_check;

alter table public.affiliate_links
  add constraint affiliate_links_destination_check
  check (
    char_length(destination_url) between 1 and 2048
    and destination_url ~ '^/[A-Za-z0-9/_?=&%#.-]*$'
    and destination_url !~ '^//'
  );

create or replace function app_private.resolve_affiliate_referral(target_slug text)
returns table(destination_url text)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
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
    resolved_url ~ '^/[A-Za-z0-9/_?=&%#.-]*$'
    and resolved_url !~ '^//'
  ) then
    raise exception 'Destino do link de afiliado não autorizado.' using errcode = '22023';
  end if;

  return query select resolved_url;
end;
$function$;
