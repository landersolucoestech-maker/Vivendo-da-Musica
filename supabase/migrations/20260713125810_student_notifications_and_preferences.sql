create type public.student_notification_category as enum ('course', 'order', 'community', 'system');
create type public.student_theme as enum ('system', 'light', 'dark');

create table public.student_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category public.student_notification_category not null default 'system',
  title text not null,
  body text not null,
  action_url text,
  read_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint student_notifications_title_check check (length(title) between 1 and 160),
  constraint student_notifications_body_check check (length(body) between 1 and 2000),
  constraint student_notifications_action_url_check check (
    action_url is null or (left(action_url, 1) = '/' and length(action_url) <= 500)
  ),
  constraint student_notifications_expiry_check check (expires_at is null or expires_at > created_at)
);
create index student_notifications_user_created_idx
  on public.student_notifications (user_id, created_at desc);
create index student_notifications_user_unread_idx
  on public.student_notifications (user_id, created_at desc) where read_at is null;

create table public.student_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  course_updates boolean not null default true,
  community_activity boolean not null default true,
  marketing_emails boolean not null default false,
  public_profile boolean not null default true,
  show_progress boolean not null default false,
  locale text not null default 'pt-BR',
  theme public.student_theme not null default 'system',
  subscription_plan text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_preferences_locale_check check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  constraint student_preferences_plan_check check (subscription_plan in ('free', 'premium', 'enterprise'))
);

create or replace function public.set_student_preferences_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.set_student_preferences_updated_at() from public, anon, authenticated;
create trigger set_student_preferences_updated_at
before update on public.student_preferences
for each row execute function public.set_student_preferences_updated_at();

alter table public.student_notifications enable row level security;
alter table public.student_preferences enable row level security;

create policy "Users view own notifications" on public.student_notifications
  for select to authenticated
  using ((select auth.uid()) = user_id and (expires_at is null or expires_at > now()));
create policy "Users mark own notifications" on public.student_notifications
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users view own preferences" on public.student_preferences
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users create own preferences" on public.student_preferences
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users update own preferences" on public.student_preferences
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.student_notifications, public.student_preferences from anon, authenticated;
grant select on public.student_notifications to authenticated;
grant update (read_at) on public.student_notifications to authenticated;
grant select on public.student_preferences to authenticated;
grant insert (
  user_id, course_updates, community_activity, marketing_emails,
  public_profile, show_progress, locale, theme
) on public.student_preferences to authenticated;
grant update (
  course_updates, community_activity, marketing_emails,
  public_profile, show_progress, locale, theme
) on public.student_preferences to authenticated;
grant all on public.student_notifications, public.student_preferences to service_role;
