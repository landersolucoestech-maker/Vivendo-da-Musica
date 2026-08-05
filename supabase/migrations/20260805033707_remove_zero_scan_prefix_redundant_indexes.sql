-- Remove only non-unique, non-constraint indexes with zero observed scans that
-- are fully covered by the leftmost key prefix of another valid index on the
-- same table. Prefix-compatible covering indexes preserve equality lookups and
-- foreign-key maintenance while reducing write amplification.

drop index if exists public.beat_deliveries_purchase_id_idx;
drop index if exists public.idx_beat_order_items_order;
drop index if exists public.community_comments_post_id_idx;
drop index if exists public.community_group_members_user_id_idx;
drop index if exists public.community_post_likes_user_id_idx;
drop index if exists public.community_posts_author_id_idx;
drop index if exists public.community_posts_group_id_idx;
drop index if exists public.course_certificates_course_id_idx;
drop index if exists public.course_certificates_user_id_idx;
drop index if exists public.enrollments_course_id_idx;
drop index if exists public.opportunity_favorites_user_id_idx;
drop index if exists public.producer_payout_methods_producer_id_idx;
drop index if exists public.student_notifications_user_id_idx;
drop index if exists public.support_tickets_user_id_idx;
