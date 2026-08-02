-- Reconcile the historical multi-course schema with the richer curriculum
-- contract used by the Supabase development branch.

alter table public.courses
  add column if not exists short_description text,
  add column if not exists category text,
  add column if not exists original_price_cents integer,
  add column if not exists discount_cents integer,
  add column if not exists visibility text,
  add column if not exists published_at timestamptz;

-- Preserve legacy public-catalog behavior: courses that were already published
-- become public only when the visibility column did not previously carry a value.
update public.courses
set original_price_cents = coalesce(original_price_cents, price_cents, 0),
    discount_cents = coalesce(discount_cents, 0),
    visibility = coalesce(
      visibility,
      case when status::text = 'published' then 'public' else 'private' end
    );

alter table public.courses
  alter column original_price_cents set default 0,
  alter column original_price_cents set not null,
  alter column discount_cents set default 0,
  alter column discount_cents set not null,
  alter column visibility set default 'private',
  alter column visibility set not null;

do $migration$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.courses'::regclass
      and conname = 'courses_original_price_nonnegative'
  ) then
    alter table public.courses
      add constraint courses_original_price_nonnegative
      check (original_price_cents >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.courses'::regclass
      and conname = 'courses_discount_nonnegative'
  ) then
    alter table public.courses
      add constraint courses_discount_nonnegative
      check (discount_cents >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.courses'::regclass
      and conname = 'courses_discount_not_above_original'
  ) then
    alter table public.courses
      add constraint courses_discount_not_above_original
      check (discount_cents <= original_price_cents);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.courses'::regclass
      and conname = 'courses_visibility_check'
  ) then
    alter table public.courses
      add constraint courses_visibility_check
      check (visibility in ('public', 'private', 'unlisted'));
  end if;
end
$migration$;

-- The current Supabase branch calculates price_cents as a generated column.
-- Historical rebuilds keep a normal column, so synchronize it through a trigger
-- only in that legacy model.
create or replace function public.sync_legacy_course_price_cents()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  new.price_cents := greatest(new.original_price_cents - new.discount_cents, 0);
  return new;
end
$function$;

do $migration$
declare
  price_is_generated boolean;
begin
  select is_generated = 'ALWAYS'
  into price_is_generated
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'courses'
    and column_name = 'price_cents';

  if not coalesce(price_is_generated, false) then
    drop trigger if exists sync_legacy_course_price_cents on public.courses;
    create trigger sync_legacy_course_price_cents
    before insert or update of original_price_cents, discount_cents
    on public.courses
    for each row execute function public.sync_legacy_course_price_cents();

    update public.courses
    set price_cents = greatest(original_price_cents - discount_cents, 0);
  end if;
end
$migration$;

create index if not exists courses_visibility_status_idx
  on public.courses(visibility, status);
