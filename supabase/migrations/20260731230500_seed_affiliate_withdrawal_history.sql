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
values (
  'af600000-0000-4000-8000-000000000001'::uuid,
  'af100000-0000-4000-8000-000000000001'::uuid,
  25000,
  'paid',
  'pix',
  'DEV-PIX-0001',
  now() - interval '20 days',
  now() - interval '18 days'
)
on conflict (id) do nothing;
