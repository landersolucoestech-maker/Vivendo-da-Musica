-- Normalize the historical enum to the text contract used by the current
-- marketplace domain and development fixtures.

do $$
declare
  current_type text;
begin
  select columns.udt_name
  into current_type
  from information_schema.columns
  where columns.table_schema = 'public'
    and columns.table_name = 'beat_licenses'
    and columns.column_name = 'license_type';

  if current_type = 'beat_license_type' then
    alter table public.beat_licenses
      alter column license_type type text
      using license_type::text;
  end if;
end
$$;

alter table public.beat_licenses
  drop constraint if exists beat_licenses_license_type_check;

alter table public.beat_licenses
  add constraint beat_licenses_license_type_check
  check (license_type in ('basic','premium','unlimited','exclusive'));
