-- The archive decompression helper exists only when historical reconciliation
-- imported compressed snapshots. Revoke API execution when present and allow a
-- clean migration replay when no helper was ever created.

do $$
declare
  archive_helper regprocedure := to_regprocedure(
    'legacy_archive.lzss_decompress(bytea)'
  );
begin
  if archive_helper is not null then
    execute format(
      'revoke execute on function %s from public, anon, authenticated, service_role',
      archive_helper
    );
  end if;
end;
$$;
