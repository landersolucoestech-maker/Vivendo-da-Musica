-- Consolidate audit, CMS and support FAQ policies around the canonical
-- platform-staff authorization helper.

drop policy if exists "Staff reads audit logs" on public.admin_audit_logs;

-- CMS reads are split by effective role to avoid a public policy overlapping
-- both the demo preview and staff policies.
drop policy if exists "Public reads published or due CMS documents" on public.cms_documents;
drop policy if exists cms_documents_demo_select on public.cms_documents;
drop policy if exists cms_documents_staff_select on public.cms_documents;

create policy cms_documents_anon_select
on public.cms_documents
for select
to anon
using (
  is_demo = true
  or status = 'published'
  or (status = 'scheduled' and scheduled_at <= now())
);

create policy cms_documents_authenticated_select
on public.cms_documents
for select
to authenticated
using (
  status = 'published'
  or (status = 'scheduled' and scheduled_at <= now())
  or public.is_platform_staff()
);

drop policy if exists "Staff creates CMS documents" on public.cms_documents;
drop policy if exists "Staff updates CMS documents" on public.cms_documents;
drop policy if exists "Staff deletes CMS documents" on public.cms_documents;

-- FAQ reads: public users see published content; authenticated platform staff
-- additionally see drafts through one dedicated policy.
drop policy if exists "Published FAQ is visible to authenticated users" on public.support_faq;
drop policy if exists support_faq_public_read on public.support_faq;

create policy support_faq_anon_read
on public.support_faq
for select
to anon
using (published);

create policy support_faq_authenticated_read
on public.support_faq
for select
to authenticated
using (
  published
  or public.is_platform_staff()
);
