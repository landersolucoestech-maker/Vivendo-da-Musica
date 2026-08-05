begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

with effective_policies as (
  select policy.tablename, policy.policyname, effective_role.role_name, expanded_command.command
  from pg_policies as policy
  cross join (values ('anon'::name), ('authenticated'::name)) as effective_role(role_name)
  cross join lateral unnest(
    case when policy.cmd='ALL'
      then array['SELECT','INSERT','UPDATE','DELETE']::text[]
      else array[policy.cmd]::text[]
    end
  ) as expanded_command(command)
  where policy.schemaname='public'
    and ('public'=any(policy.roles) or effective_role.role_name=any(policy.roles))
), duplicates as (
  select tablename, role_name, command
  from effective_policies
  group by tablename, role_name, command
  having count(*) > 1
)
select is((select count(*)::bigint from duplicates), 0::bigint,
  'no public table has overlapping effective permissive RLS policies');

select is((
  select count(*)::bigint
  from pg_policies
  where schemaname='public'
    and permissive <> 'PERMISSIVE'
), 0::bigint, 'all public RLS policies remain permissive');

select is((
  select count(*)::bigint
  from pg_policies
  cross join lateral unnest(roles) as policy_role
  where schemaname='public'
    and policy_role not in ('public'::name,'anon'::name,'authenticated'::name)
), 0::bigint, 'public RLS policies use only supported API roles');

select is((
  select count(*)::bigint
  from pg_policies
  where schemaname='public' and tablename='community_posts'
    and policyname='community_posts_anon_read'
    and qual ilike '%community_group.visibility = ''public''%'
), 1::bigint, 'anonymous community posts require public group visibility');

select is((
  select count(*)::bigint
  from pg_policies
  where schemaname='public' and tablename='community_comments'
    and policyname='community_comments_anon_read'
    and qual ilike '%community_post.status = ''published''%'
    and qual ilike '%community_group.visibility = ''public''%'
), 1::bigint, 'anonymous community comments inherit parent post visibility');

select is((
  select count(*)::bigint
  from pg_policies
  where schemaname='public' and tablename='cms_documents'
    and policyname='cms_documents_anon_select'
    and qual ilike '%is_demo = true%'
    and qual ilike '%scheduled_at <= now()%'
), 1::bigint, 'CMS anonymous reads preserve demo and due scheduled content');

select is((
  select count(*)::bigint
  from pg_policies
  where schemaname='public' and tablename='support_faq'
    and policyname='support_faq_authenticated_read'
    and qual ilike '%is_platform_staff()%'
), 1::bigint, 'authenticated staff retain draft FAQ visibility');

select is((
  select count(*)::bigint
  from pg_policies
  where schemaname='public' and tablename='seller_products'
    and policyname='seller_products_owner_delete'
    and qual ilike '%status = ''draft''%'
    and qual ilike '%is_platform_staff()%'
), 1::bigint, 'sellers delete only drafts while staff retain moderation access');

select is((
  select count(*)::bigint
  from pg_policies
  where schemaname='public' and tablename='service_listings'
    and policyname='service_listings_anon_read'
    and qual ilike '%is_demo = true%'
    and qual ilike '%moderation_status = ''approved''%'
), 1::bigint, 'anonymous service listings are demo or approved published listings');

select is((
  select count(*)::bigint
  from pg_policies
  where schemaname='public' and tablename='service_packages'
    and policyname='service_packages_anon_read'
    and qual ilike '%listing.is_demo = true%'
    and qual ilike '%service_packages.active = true%'
), 1::bigint, 'anonymous service packages preserve demo and active public access');

select * from finish();
rollback;
