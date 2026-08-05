begin;
create extension if not exists pgtap with schema extensions;
select plan(2);

select is(
  (
    select count(*)::bigint
    from pg_class as candidate
    join pg_namespace as schema_name
      on schema_name.oid = candidate.relnamespace
    where schema_name.nspname = 'public'
      and candidate.relkind = 'i'
      and candidate.relname = any(array[
        'beat_deliveries_purchase_id_idx',
        'idx_beat_order_items_order',
        'community_comments_post_id_idx',
        'community_group_members_user_id_idx',
        'community_post_likes_user_id_idx',
        'community_posts_author_id_idx',
        'community_posts_group_id_idx',
        'course_certificates_course_id_idx',
        'course_certificates_user_id_idx',
        'enrollments_course_id_idx',
        'opportunity_favorites_user_id_idx',
        'producer_payout_methods_producer_id_idx',
        'student_notifications_user_id_idx',
        'support_tickets_user_id_idx'
      ]::name[])
  ),
  0::bigint,
  'selected zero-scan prefix-redundant indexes are absent'
);

select is(
  (
    select count(*)::bigint
    from pg_class as covering_index
    join pg_namespace as schema_name
      on schema_name.oid = covering_index.relnamespace
    where schema_name.nspname = 'public'
      and covering_index.relkind = 'i'
      and covering_index.relname = any(array[
        'beat_deliveries_purchase_file_unique',
        'beat_order_items_order_id_license_id_key',
        'community_comments_post_idx',
        'community_group_members_user_idx',
        'community_post_likes_user_idx',
        'community_posts_author_idx',
        'community_posts_group_idx',
        'course_certificates_course_issued_idx',
        'course_certificates_user_course_key',
        'enrollments_course_status_created_idx',
        'opportunity_favorites_user_idx',
        'producer_payout_methods_producer_idx',
        'student_notifications_user_created_idx',
        'support_tickets_user_created_idx'
      ]::name[])
  ),
  14::bigint,
  'all covering indexes remain available'
);

select * from finish();
rollback;
