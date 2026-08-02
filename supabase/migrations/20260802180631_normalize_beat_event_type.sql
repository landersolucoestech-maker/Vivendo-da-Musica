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
    and columns.table_name = 'beat_events'
    and columns.column_name = 'event_type';

  if current_type = 'beat_event_type' then
    alter table public.beat_events
      alter column event_type type text
      using event_type::text;
  end if;
end
$$;

alter table public.beat_events
  drop constraint if exists beat_events_event_type_check;

alter table public.beat_events
  add constraint beat_events_event_type_check
  check (event_type in ('view','play','add_to_cart','checkout','purchase'));
