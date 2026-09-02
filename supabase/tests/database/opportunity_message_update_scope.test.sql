begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

select ok(
  has_column_privilege('authenticated', 'public.opportunity_application_messages', 'read_at', 'UPDATE'),
  'authenticated users may update message read receipts'
);

select ok(
  has_column_privilege('anon', 'public.opportunity_application_messages', 'read_at', 'UPDATE'),
  'demo anonymous flows may update message read receipts'
);

select ok(
  not has_column_privilege('authenticated', 'public.opportunity_application_messages', 'body', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.opportunity_application_messages', 'sender_id', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.opportunity_application_messages', 'sender_type', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.opportunity_application_messages', 'application_id', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.opportunity_application_messages', 'created_at', 'UPDATE'),
  'authenticated users cannot rewrite message history or ownership'
);

select ok(
  not has_column_privilege('anon', 'public.opportunity_application_messages', 'body', 'UPDATE')
  and not has_column_privilege('anon', 'public.opportunity_application_messages', 'sender_id', 'UPDATE')
  and not has_column_privilege('anon', 'public.opportunity_application_messages', 'sender_type', 'UPDATE')
  and not has_column_privilege('anon', 'public.opportunity_application_messages', 'application_id', 'UPDATE')
  and not has_column_privilege('anon', 'public.opportunity_application_messages', 'created_at', 'UPDATE'),
  'demo anonymous users cannot rewrite message history or ownership'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'opportunity_application_messages'
      and policyname = 'opportunity_messages_authenticated_update'
      and roles = array['authenticated']::name[]
      and qual like '%sender_type = ''company''%'
      and qual like '%sender_type = ''candidate''%'
      and qual like '%applicant_id%'
      and qual like '%is_company_member%'
  ),
  'authenticated read receipts are limited to the recipient side of each conversation'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'opportunity_application_messages'
      and policyname = 'opportunity_messages_demo_update'
      and roles = array['anon']::name[]
  ),
  'the demo read-receipt policy remains isolated to anon'
);

select * from finish();
rollback;
