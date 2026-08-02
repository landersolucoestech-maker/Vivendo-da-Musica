-- Reconcile the operational portal fixtures with the production-grade tables
-- created earlier in the migration chain.

alter table public.student_notifications
  add column if not exists updated_at timestamptz not null default now();

alter table public.support_faq
  add column if not exists active boolean not null default true;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='support_faq' and column_name='published'
  ) then
    execute 'update public.support_faq set active = published';
  end if;
end
$$;

create or replace function public.sync_support_faq_publication_fields()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.published := new.active;
  return new;
end;
$$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='support_faq' and column_name='published'
  ) then
    drop trigger if exists sync_support_faq_publication_fields_before_write on public.support_faq;
    create trigger sync_support_faq_publication_fields_before_write
      before insert or update of active
      on public.support_faq
      for each row execute function public.sync_support_faq_publication_fields();
  end if;
end
$$;

create or replace function public.normalize_portal_demo_support_ticket()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.ticket_code is null or new.ticket_code !~ '^T-[A-F0-9]{8}$' then
    new.ticket_code := 'T-' || upper(left(replace(new.id::text, '-', ''), 8));
  end if;

  if new.status::text = 'resolved' then
    new.resolved_at := coalesce(new.resolved_at, new.updated_at, new.created_at, now());
  else
    new.resolved_at := null;
  end if;

  return new;
end;
$$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='support_tickets' and column_name='resolved_at'
  ) then
    drop trigger if exists normalize_portal_demo_support_ticket_before_write on public.support_tickets;
    create trigger normalize_portal_demo_support_ticket_before_write
      before insert or update of ticket_code, status, created_at, updated_at, resolved_at
      on public.support_tickets
      for each row execute function public.normalize_portal_demo_support_ticket();
  end if;
end
$$;

create or replace function public.normalize_portal_demo_certificate()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.enrollment_id is null then
    select enrollment.id
      into new.enrollment_id
    from public.enrollments enrollment
    where enrollment.user_id = new.user_id
      and enrollment.course_id = new.course_id
    order by enrollment.created_at desc
    limit 1;
  end if;

  if new.certificate_code is null or new.certificate_code !~ '^VDM-[A-F0-9]{16}$' then
    new.certificate_code := 'VDM-' || upper(left(replace(new.id::text, '-', ''), 16));
  end if;

  if new.revoked_at is null then
    new.revoked_reason := null;
  elsif nullif(btrim(new.revoked_reason), '') is null then
    new.revoked_reason := 'Certificado revogado';
  end if;

  return new;
end;
$$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='course_certificates' and column_name='enrollment_id'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='course_certificates' and column_name='revoked_reason'
  ) then
    drop trigger if exists normalize_portal_demo_certificate_before_write on public.course_certificates;
    create trigger normalize_portal_demo_certificate_before_write
      before insert or update of user_id, course_id, enrollment_id, certificate_code, revoked_at, revoked_reason
      on public.course_certificates
      for each row execute function public.normalize_portal_demo_certificate();
  end if;
end
$$;

revoke all on function public.sync_support_faq_publication_fields() from public, anon, authenticated;
revoke all on function public.normalize_portal_demo_support_ticket() from public, anon, authenticated;
revoke all on function public.normalize_portal_demo_certificate() from public, anon, authenticated;
