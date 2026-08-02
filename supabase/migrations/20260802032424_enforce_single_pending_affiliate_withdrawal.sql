create unique index if not exists affiliate_withdrawals_single_pending_idx
on public.affiliate_withdrawals(affiliate_id)
where status in ('requested', 'processing');
