-- Reconcile the original opportunities schema with the current company portal
-- contract while preserving policies that depend on enum-backed columns.

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

create or replace function public.normalize_legacy_opportunity_kind()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.kind::text in ('vaga', 'freela') then
    new.kind := 'job';
  elsif new.kind::text in ('colaboracao', 'colaboração') then
    new.kind := 'collab';
  elsif new.kind::text = 'edital' then
    new.kind := 'grant';
  elsif new.kind::text = 'concurso' then
    new.kind := 'contest';
  end if;

  return new;
end;
$$;

drop trigger if exists normalize_legacy_opportunity_kind_before_write on public.opportunities;
create trigger normalize_legacy_opportunity_kind_before_write
  before insert or update of kind
  on public.opportunities
  for each row execute function public.normalize_legacy_opportunity_kind();

update public.opportunities
set kind = kind;

alter table public.opportunities
  drop constraint if exists opportunities_kind_check;
alter table public.opportunities
  add constraint opportunities_kind_check
  check (kind::text in ('job','collab','sync','grant','contest'));

alter table public.opportunities
  drop constraint if exists opportunities_status_check;
alter table public.opportunities
  add constraint opportunities_status_check
  check (status::text in ('open','closed'));

alter table public.opportunity_applications
  drop constraint if exists opportunity_applications_status_check;
alter table public.opportunity_applications
  add constraint opportunity_applications_status_check
  check (status::text in ('submitted','reviewing','shortlisted','interview','approved','rejected','withdrawn'));

revoke all on function public.normalize_legacy_opportunity_kind() from public, anon, authenticated;
