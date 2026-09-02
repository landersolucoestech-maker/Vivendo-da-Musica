alter table public.company_profiles
  add constraint company_profiles_website_url_https_check
  check (
    website_url is null
    or (
      website_url ~ '^https://[A-Za-z0-9.-]+(?::[0-9]{1,5})?(?:[/?#]|$)'
      and website_url !~ E'[\\x00-\\x20\\x7f\\\\]'
    )
  );

alter table public.company_profiles
  add constraint company_profiles_logo_url_https_check
  check (
    logo_url is null
    or (
      logo_url ~ '^https://[A-Za-z0-9.-]+(?::[0-9]{1,5})?(?:[/?#]|$)'
      and logo_url !~ E'[\\x00-\\x20\\x7f\\\\]'
    )
  );
