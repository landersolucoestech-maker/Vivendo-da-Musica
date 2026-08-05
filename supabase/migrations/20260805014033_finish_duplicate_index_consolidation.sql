-- Finish duplicate-index consolidation after dependency verification.
-- Keep the canonical payout FK index. The legacy profile unique constraint is
-- removed only when no foreign key still depends on its backing index; a later
-- migration rebinds those dependencies deterministically before dropping it.

drop index if exists public.producer_payout_requests_payout_method_id_idx;

do $$
declare
  legacy_index_oid oid;
begin
  select constraint_row.conindid
  into legacy_index_oid
  from pg_constraint as constraint_row
  where constraint_row.conrelid = 'public.user_profiles'::regclass
    and constraint_row.conname = 'user_profiles_user_id_key'
    and constraint_row.contype = 'u';

  if legacy_index_oid is null then
    return;
  end if;

  if not exists (
    select 1
    from pg_constraint as foreign_key
    where foreign_key.contype = 'f'
      and foreign_key.conindid = legacy_index_oid
  ) then
    alter table public.user_profiles
      drop constraint user_profiles_user_id_key;
  end if;
end;
$$;
