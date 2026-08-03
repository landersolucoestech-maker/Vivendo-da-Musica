set local lock_timeout = '5s';

alter table public.student_preferences
  drop column if exists subscription_plan;
