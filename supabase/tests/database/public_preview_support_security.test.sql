begin;

select plan(10);

select is(
  (select prosecdef from pg_proc where oid = 'public.list_public_preview_contact_messages()'::regprocedure),
  false,
  'preview contact listing uses caller permissions'
);

select is(
  (select prosecdef from pg_proc where oid = 'public.update_public_preview_contact_message_status(uuid,text)'::regprocedure),
  false,
  'preview contact status update uses caller permissions'
);

select ok(
  has_function_privilege('anon', 'public.list_public_preview_contact_messages()', 'EXECUTE'),
  'anonymous preview can call the demo listing wrapper'
);

select ok(
  has_function_privilege('anon', 'public.update_public_preview_contact_message_status(uuid,text)', 'EXECUTE'),
  'anonymous preview can call the demo status wrapper'
);

select is(
  has_function_privilege('anon', 'public.list_demo_contact_messages()', 'EXECUTE'),
  false,
  'historical demo listing helper is not exposed anonymously'
);

select is(
  has_table_privilege('anon', 'public.contact_messages', 'DELETE'),
  false,
  'anonymous preview cannot delete contact messages'
);

select ok(
  has_column_privilege('anon', 'public.contact_messages', 'status', 'UPDATE'),
  'anonymous preview may update the demo status column'
);

select is(
  has_column_privilege('anon', 'public.contact_messages', 'name', 'UPDATE'),
  false,
  'anonymous preview cannot update contact identity columns'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'contact_messages'
      and policyname = 'contact_messages_preview_demo_select'
      and cmd = 'SELECT'
      and 'anon' = any(roles)
      and qual ilike '%is_demo%true%'
  ),
  'preview listing policy is restricted to demo rows'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'contact_messages'
      and policyname = 'contact_messages_preview_demo_update'
      and cmd = 'UPDATE'
      and 'anon' = any(roles)
      and qual ilike '%is_demo%true%'
      and with_check ilike '%is_demo%true%'
  ),
  'preview update policy is restricted to demo rows'
);

select * from finish();
rollback;
