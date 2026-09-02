begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.company_profiles'::regclass
      and conname = 'company_profiles_website_url_https_check'
  ),
  'company profile website url has an HTTPS constraint'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.company_profiles'::regclass
      and conname = 'company_profiles_logo_url_https_check'
  ),
  'company profile logo url has an HTTPS constraint'
);

select ok(
  'https://example.com/company' ~ '^https://[A-Za-z0-9.-]+(?::[0-9]{1,5})?(?:[/?#]|$)'
  and not ('https://example.com/company' ~ E'[\\x00-\\x20\\x7f\\\\]'),
  'normal HTTPS company URLs satisfy the accepted grammar'
);

select ok(
  not ('javascript:alert(1)' ~ '^https://[A-Za-z0-9.-]+(?::[0-9]{1,5})?(?:[/?#]|$)')
  and not ('http://example.com' ~ '^https://[A-Za-z0-9.-]+(?::[0-9]{1,5})?(?:[/?#]|$)')
  and ('https://example.com\\evil' ~ E'[\\x00-\\x20\\x7f\\\\]'),
  'unsafe company URL schemes and backslash variants are rejected'
);

select * from finish();
rollback;
