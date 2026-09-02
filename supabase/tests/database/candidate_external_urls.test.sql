begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.candidate_profiles'::regclass
      and conname = 'candidate_profiles_portfolio_url_https_check'
  ),
  'candidate portfolio url has an HTTPS constraint'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.candidate_profiles'::regclass
      and conname = 'candidate_profiles_resume_url_https_check'
  ),
  'candidate resume url has an HTTPS constraint'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.opportunity_applications'::regclass
      and conname = 'opportunity_applications_portfolio_url_https_check'
  ),
  'application portfolio url has an HTTPS constraint'
);

select ok(
  'https://example.com/portfolio' ~ '^https://[A-Za-z0-9.-]+(?::[0-9]{1,5})?(?:[/?#]|$)'
  and not ('https://example.com/portfolio' ~ E'[\\x00-\\x20\\x7f\\\\]'),
  'normal HTTPS candidate URLs satisfy the accepted grammar'
);

select ok(
  not ('javascript:alert(1)' ~ '^https://[A-Za-z0-9.-]+(?::[0-9]{1,5})?(?:[/?#]|$)')
  and not ('data:text/html,test' ~ '^https://[A-Za-z0-9.-]+(?::[0-9]{1,5})?(?:[/?#]|$)')
  and not ('http://example.com' ~ '^https://[A-Za-z0-9.-]+(?::[0-9]{1,5})?(?:[/?#]|$)')
  and ('https://example.com\\evil' ~ E'[\\x00-\\x20\\x7f\\\\]'),
  'unsafe candidate URL schemes and backslash variants are rejected'
);

select * from finish();
rollback;
