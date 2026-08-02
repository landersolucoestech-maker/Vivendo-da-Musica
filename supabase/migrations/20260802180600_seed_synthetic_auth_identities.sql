-- Synthetic auth principals required by development-only fixtures.
-- They are not exposed as real credentials and exist only to satisfy historical
-- foreign keys from public profiles, courses, applications and messages.

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  ('00000000-0000-0000-0000-000000000000','11111111-1111-4111-8111-111111111111','authenticated','authenticated','aluno.dev@vivendodamusica.invalid','',now(),'{}'::jsonb,'{"full_name":"Aluno de Desenvolvimento","account_type":"student"}'::jsonb,now(),now()),
  ('00000000-0000-0000-0000-000000000000','22222222-2222-4222-8222-222222222222','authenticated','authenticated','produtor.dev@vivendodamusica.invalid','',now(),'{}'::jsonb,'{"full_name":"Produtor de Desenvolvimento","account_type":"student"}'::jsonb,now(),now()),
  ('00000000-0000-0000-0000-000000000000','33333333-3333-4333-8333-333333333333','authenticated','authenticated','afiliado.dev@vivendodamusica.invalid','',now(),'{}'::jsonb,'{"full_name":"Afiliado de Desenvolvimento","account_type":"student"}'::jsonb,now(),now()),
  ('00000000-0000-0000-0000-000000000000','44444444-4444-4444-8444-444444444444','authenticated','authenticated','admin.dev@vivendodamusica.invalid','',now(),'{}'::jsonb,'{"full_name":"Administrador de Desenvolvimento","account_type":"student"}'::jsonb,now(),now()),
  ('00000000-0000-0000-0000-000000000000','c3942032-967a-4cde-b00c-22446584e699','authenticated','authenticated','instrutor.dev@vivendodamusica.invalid','',now(),'{}'::jsonb,'{"full_name":"Instrutor de Desenvolvimento","account_type":"student"}'::jsonb,now(),now()),
  ('00000000-0000-0000-0000-000000000000','55555555-5555-4555-8555-555555555555','authenticated','authenticated','empresa.dev@vivendodamusica.invalid','',now(),'{}'::jsonb,'{"full_name":"Equipe Estúdio Órbita","account_type":"student"}'::jsonb,now(),now()),
  ('00000000-0000-0000-0000-000000000000','66666666-6666-4666-8666-666666666666','authenticated','authenticated','marina.dev@vivendodamusica.invalid','',now(),'{}'::jsonb,'{"full_name":"Marina Alves","account_type":"student"}'::jsonb,now(),now()),
  ('00000000-0000-0000-0000-000000000000','77777777-7777-4777-8777-777777777777','authenticated','authenticated','rafael.dev@vivendodamusica.invalid','',now(),'{}'::jsonb,'{"full_name":"Rafael Nunes","account_type":"student"}'::jsonb,now(),now()),
  ('00000000-0000-0000-0000-000000000000','88888888-8888-4888-8888-888888888888','authenticated','authenticated','bianca.dev@vivendodamusica.invalid','',now(),'{}'::jsonb,'{"full_name":"Bianca Souza","account_type":"student"}'::jsonb,now(),now())
on conflict (id) do nothing;

insert into public.user_profiles (user_id,full_name,role,is_demo)
values
  ('11111111-1111-4111-8111-111111111111','Aluno de Desenvolvimento','student',true),
  ('22222222-2222-4222-8222-222222222222','Produtor de Desenvolvimento','producer',true),
  ('33333333-3333-4333-8333-333333333333','Afiliado de Desenvolvimento','affiliate',true),
  ('44444444-4444-4444-8444-444444444444','Administrador de Desenvolvimento','admin',true),
  ('c3942032-967a-4cde-b00c-22446584e699','Instrutor de Desenvolvimento','instructor',true),
  ('66666666-6666-4666-8666-666666666666','Marina Alves','student',true),
  ('77777777-7777-4777-8777-777777777777','Rafael Nunes','student',true),
  ('88888888-8888-4888-8888-888888888888','Bianca Souza','student',true)
on conflict (user_id) do update
set full_name=excluded.full_name,
    role=excluded.role,
    is_demo=true,
    updated_at=now();

insert into public.user_profiles (user_id,full_name,role,is_demo)
values ('55555555-5555-4555-8555-555555555555','Equipe Estúdio Órbita','student',true)
on conflict (user_id) do update
set full_name=excluded.full_name,
    is_demo=true,
    updated_at=now();
