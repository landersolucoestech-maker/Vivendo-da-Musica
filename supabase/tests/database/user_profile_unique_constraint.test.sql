begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

select is(
  (
    select count(*)::bigint
    from pg_constraint
    where conrelid = 'public.user_profiles'::regclass
      and conname = 'user_profiles_user_id_unique'
      and contype = 'u'
  ),
  1::bigint,
  'canonical user profile unique constraint exists'
);

select is(
  (
    select count(*)::bigint
    from pg_constraint
    where conrelid = 'public.user_profiles'::regclass
      and conname = 'user_profiles_user_id_key'
  ),
  0::bigint,
  'legacy duplicate user profile unique constraint is absent'
);

select ok(
  (
    select count(*)
    from pg_constraint as foreign_key
    where foreign_key.contype = 'f'
      and foreign_key.confrelid = 'public.user_profiles'::regclass
      and foreign_key.confkey = array[
        (
          select attribute.attnum
          from pg_attribute as attribute
          where attribute.attrelid = 'public.user_profiles'::regclass
            and attribute.attname = 'user_id'
            and not attribute.attisdropped
        )
      ]::smallint[]
  ) > 0,
  'foreign keys reference user_profiles.user_id'
);

select is(
  (
    select count(*)::bigint
    from pg_constraint as foreign_key
    where foreign_key.contype = 'f'
      and foreign_key.confrelid = 'public.user_profiles'::regclass
      and foreign_key.confkey = array[
        (
          select attribute.attnum
          from pg_attribute as attribute
          where attribute.attrelid = 'public.user_profiles'::regclass
            and attribute.attname = 'user_id'
            and not attribute.attisdropped
        )
      ]::smallint[]
      and foreign_key.conindid <> (
        select canonical_constraint.conindid
        from pg_constraint as canonical_constraint
        where canonical_constraint.conrelid = 'public.user_profiles'::regclass
          and canonical_constraint.conname = 'user_profiles_user_id_unique'
          and canonical_constraint.contype = 'u'
      )
  ),
  0::bigint,
  'all user profile foreign keys depend on the canonical unique index'
);

select * from finish();
rollback;
