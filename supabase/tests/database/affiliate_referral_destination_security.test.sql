begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.affiliate_links'::regclass
      and conname = 'affiliate_links_destination_check'
      and contype = 'c'
  ),
  'affiliate links keep a destination check constraint'
);

select ok(
  (
    select pg_get_constraintdef(oid)
    from pg_constraint
    where conrelid = 'public.affiliate_links'::regclass
      and conname = 'affiliate_links_destination_check'
  ) like '%^/[A-Za-z0-9/_?=&%#.-]*$%',
  'affiliate destination constraint requires an internal root-relative path'
);

select ok(
  (
    select pg_get_constraintdef(oid)
    from pg_constraint
    where conrelid = 'public.affiliate_links'::regclass
      and conname = 'affiliate_links_destination_check'
  ) like '%^//%',
  'affiliate destination constraint explicitly rejects protocol-relative paths'
);

select ok(
  pg_get_functiondef('app_private.resolve_affiliate_referral(text)'::regprocedure) like '%^/[A-Za-z0-9/_?=&%#.-]*$%'
  and pg_get_functiondef('app_private.resolve_affiliate_referral(text)'::regprocedure) not like '%^https://%',
  'affiliate referral resolver only accepts internal destinations'
);

select ok(
  '/academia/curso-demo?origem=afiliado#conteudo' ~ '^/[A-Za-z0-9/_?=&%#.-]*$'
  and '/academia/curso-demo?origem=afiliado#conteudo' !~ '^//',
  'normal internal affiliate destinations remain valid'
);

select ok(
  not ('https://evil.example/phishing' ~ '^/[A-Za-z0-9/_?=&%#.-]*$' and 'https://evil.example/phishing' !~ '^//'),
  'absolute HTTPS destinations are rejected'
);

select ok(
  not ('//evil.example/phishing' ~ '^/[A-Za-z0-9/_?=&%#.-]*$' and '//evil.example/phishing' !~ '^//'),
  'protocol-relative destinations are rejected'
);

select ok(
  not (('/academia/' || chr(92) || 'evil') ~ '^/[A-Za-z0-9/_?=&%#.-]*$')
  and not (('/academia/' || chr(10) || 'evil') ~ '^/[A-Za-z0-9/_?=&%#.-]*$'),
  'backslashes and control characters are rejected'
);

select * from finish();
rollback;