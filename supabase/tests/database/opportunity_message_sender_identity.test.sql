begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'opportunity_application_messages'
      and policyname = 'opportunity_messages_authenticated_insert'
      and roles = array['authenticated']::name[]
      and with_check like '%sender_id = ( SELECT auth.uid()%'
  ),
  'authenticated message inserts bind sender_id to auth.uid'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'opportunity_application_messages'
      and policyname = 'opportunity_messages_authenticated_insert'
      and with_check like '%applicant_id = ( SELECT auth.uid()%'
      and with_check like '%sender_type = ''candidate''%'
  ),
  'candidate message inserts require candidate sender type'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'opportunity_application_messages'
      and policyname = 'opportunity_messages_authenticated_insert'
      and with_check like '%is_company_member%'
      and with_check like '%sender_type = ''company''%'
  ),
  'company message inserts require company sender type'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'opportunity_application_messages'
      and policyname = 'opportunity_messages_demo_insert'
      and roles = array['anon']::name[]
  ),
  'demo message insert policy remains isolated to anon'
);

select * from finish();
rollback;
