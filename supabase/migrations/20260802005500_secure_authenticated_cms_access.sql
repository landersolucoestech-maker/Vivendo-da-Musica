create policy cms_documents_staff_select on public.cms_documents
for select to authenticated
using (public.is_platform_staff());

create policy cms_documents_staff_insert on public.cms_documents
for insert to authenticated
with check (public.is_platform_staff());

create policy cms_documents_staff_update on public.cms_documents
for update to authenticated
using (public.is_platform_staff())
with check (public.is_platform_staff());

create policy cms_documents_staff_delete on public.cms_documents
for delete to authenticated
using (public.is_platform_staff());
