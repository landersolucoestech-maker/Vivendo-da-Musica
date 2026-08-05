begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

select ok(
  not has_database_privilege('anon', current_database(), 'TEMP'),
  'anon cannot create temporary objects'
);

select ok(
  not has_database_privilege('authenticated', current_database(), 'TEMP'),
  'authenticated cannot create temporary objects'
);

select ok(
  not has_database_privilege('anon', current_database(), 'CREATE')
  and not has_database_privilege('authenticated', current_database(), 'CREATE'),
  'client roles cannot create database schemas'
);

select ok(
  has_database_privilege('service_role', current_database(), 'TEMP')
  and has_database_privilege('authenticator', current_database(), 'TEMP'),
  'managed service roles retain temporary object capability'
);

select * from finish();
rollback;
