-- Reconcile the original opportunities enums and required public slug with the
-- current company portal contract. The application uses explicit constrained
-- text values so new workflow stages can be introduced without enum rewrites.

do $$
declare
  kind_type text;
  opportunity_status_type text;
  application_status_type text;
begin
  select columns.udt_name
  into kind_type
  from information_schema.columns
  where columns.table_schema = 'public'
    and columns.table_name = 'opportunities'
    and columns.column_name = 'kind';

  if kind_type = 'opportunity_kind' then
    alter table public.opportunities
      alter column kind type text
      using kind::text;
  end if;

  select columns.udt_name
  into opportunity_status_type
  from information_schema.columns
  where columns.table_schema = 'public'
    and columns.table_name = 'opportunities'
    and columns.column_name = 'status';

  if opportunity_status_type = 'opportunity_status' then
    alter table public.opportunities
      alter column status drop default;
    alter table public.opportunities
      alter column status type text
      using status::text;
    alter table public.opportunities
      alter column status set default 'open';
  end if;

  select columns.udt_name
  into application_status_type
  from information_schema.columns
  where columns.table_schema = 'public'
    and columns.table_name = 'opportunity_applications'
    and columns.column_name = 'status';

  if application_status_type = 'opportunity_application_status' then
    alter table public.opportunity_applications
      alter column status drop default;
    alter table public.opportunity_applications
      alter column status type text
      using status::text;
    alter table public.opportunity_applications
      alter column status set default 'submitted';
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'opportunities'
      and column_name = 'slug'
  ) then
    alter table public.opportunities alter column slug drop not null;
  end if;
end
$$;

alter table public.opportunities
  drop constraint if exists opportunities_kind_check;
alter table public.opportunities
  add constraint opportunities_kind_check
  check (kind in ('job','collab','sync','grant','contest'));

alter table public.opportunities
  drop constraint if exists opportunities_status_check;
alter table public.opportunities
  add constraint opportunities_status_check
  check (status in ('open','closed'));

alter table public.opportunity_applications
  drop constraint if exists opportunity_applications_status_check;
alter table public.opportunity_applications
  add constraint opportunity_applications_status_check
  check (status in ('submitted','reviewing','shortlisted','interview','approved','rejected','withdrawn'));
