-- Archive-only decompression helper. Keep it callable by the owning database
-- role only; clients and service APIs do not need direct execution rights.

revoke execute on function legacy_archive.lzss_decompress(bytea)
from public, anon, authenticated, service_role;
