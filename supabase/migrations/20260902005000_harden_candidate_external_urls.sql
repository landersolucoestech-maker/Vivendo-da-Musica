alter table public.candidate_profiles
  add constraint candidate_profiles_portfolio_url_https_check
  check (
    portfolio_url is null
    or (
      portfolio_url ~ '^https://[A-Za-z0-9.-]+(?::[0-9]{1,5})?(?:[/?#]|$)'
      and portfolio_url !~ E'[\\x00-\\x20\\x7f\\\\]'
    )
  );

alter table public.candidate_profiles
  add constraint candidate_profiles_resume_url_https_check
  check (
    resume_url is null
    or (
      resume_url ~ '^https://[A-Za-z0-9.-]+(?::[0-9]{1,5})?(?:[/?#]|$)'
      and resume_url !~ E'[\\x00-\\x20\\x7f\\\\]'
    )
  );

alter table public.opportunity_applications
  add constraint opportunity_applications_portfolio_url_https_check
  check (
    portfolio_url is null
    or (
      portfolio_url ~ '^https://[A-Za-z0-9.-]+(?::[0-9]{1,5})?(?:[/?#]|$)'
      and portfolio_url !~ E'[\\x00-\\x20\\x7f\\\\]'
    )
  );
