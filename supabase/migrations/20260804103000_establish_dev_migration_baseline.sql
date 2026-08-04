-- Canonical migration-history baseline for the DEV Supabase project.
--
-- This migration intentionally has no DDL. Its applied status proves that the
-- legacy remote schema was compared with the complete canonical migration
-- chain before the histories were reconciled. Future deploys may then apply
-- only migrations newer than this baseline.
select 1;
