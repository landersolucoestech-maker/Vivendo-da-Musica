create type public.academy_content_status as enum ('draft', 'published');

create table public.academy_contents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  subtitle text,
  description text,
  body text,
  category text,
  tags text[] not null default '{}',
  thumbnail_url text,
  banner_url text,
  video_url text,
  video_file_name text,
  video_mime_type text,
  video_size bigint,
  status public.academy_content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create table public.academy_content_attachments (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.academy_contents(id) on delete cascade,
  name text not null,
  file_url text not null,
  mime_type text not null,
  size bigint not null,
  created_at timestamptz not null default now()
);

create trigger update_academy_contents_updated_at
  before update on public.academy_contents
  for each row execute function update_updated_at_column();

alter table public.academy_contents enable row level security;
alter table public.academy_content_attachments enable row level security;

create policy "Published academy content is publicly visible"
  on public.academy_contents for select
  to anon, authenticated
  using (status = 'published');

create policy "Staff can manage academy content"
  on public.academy_contents for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "Published academy content attachments are publicly visible"
  on public.academy_content_attachments for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.academy_contents c
      where c.id = academy_content_attachments.content_id
        and c.status = 'published'
    )
  );

create policy "Staff can manage academy content attachments"
  on public.academy_content_attachments for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('academy-videos', 'academy-videos', true, 524288000, array['video/mp4', 'video/webm', 'video/quicktime']::text[]),
  ('academy-images', 'academy-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp']::text[]),
  ('academy-materials', 'academy-materials', true, 104857600, array[
    'application/pdf',
    'application/zip',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Public can read published academy storage assets"
  on storage.objects for select
  to public
  using (bucket_id in ('academy-videos', 'academy-images', 'academy-materials'));

create policy "Staff can upload academy storage assets"
  on storage.objects for insert
  to authenticated
  with check (bucket_id in ('academy-videos', 'academy-images', 'academy-materials') and public.is_staff());

create policy "Staff can update academy storage assets"
  on storage.objects for update
  to authenticated
  using (bucket_id in ('academy-videos', 'academy-images', 'academy-materials') and public.is_staff());

create policy "Staff can delete academy storage assets"
  on storage.objects for delete
  to authenticated
  using (bucket_id in ('academy-videos', 'academy-images', 'academy-materials') and public.is_staff());
