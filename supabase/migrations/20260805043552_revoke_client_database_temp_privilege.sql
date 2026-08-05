-- API client roles do not need temporary schemas or temporary tables. Remove
-- TEMPORARY at the database level while preserving service and authenticator
-- capabilities managed by Supabase.

do $$
begin
  execute format(
    'revoke temporary on database %I from anon, authenticated',
    current_database()
  );
end;
$$;
