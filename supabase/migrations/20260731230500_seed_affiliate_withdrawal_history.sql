-- Seed only when the affiliate withdrawal domain is present. The full historical
-- local rebuild predates this development-only domain, while the Supabase dev
-- branch already contains both tables.
do $$
begin
  if to_regclass('public.affiliate_withdrawals') is null
     or to_regclass('public.affiliate_profiles') is null then
    return;
  end if;

  execute $seed$
    insert into public.affiliate_withdrawals (
      id,
      affiliate_id,
      amount_cents,
      status,
      payment_method,
      payment_reference,
      requested_at,
      processed_at
    )
    select
      'af600000-0000-4000-8000-000000000001'::uuid,
      profile.id,
      25000,
      'paid',
      'pix',
      'DEV-PIX-0001',
      now() - interval '20 days',
      now() - interval '18 days'
    from public.affiliate_profiles as profile
    where profile.id = 'af100000-0000-4000-8000-000000000001'::uuid
    on conflict (id) do nothing
  $seed$;
end
$$;
