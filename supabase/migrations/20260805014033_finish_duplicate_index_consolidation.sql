-- Finish duplicate-index consolidation after dependency verification.
-- Keep the canonical payout FK index and the profile unique constraint used by
-- downstream foreign keys.

drop index if exists public.producer_payout_requests_payout_method_id_idx;

alter table public.user_profiles
  drop constraint if exists user_profiles_user_id_key;
