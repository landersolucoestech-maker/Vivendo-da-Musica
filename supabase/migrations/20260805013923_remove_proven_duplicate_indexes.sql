-- Remove only byte-for-byte duplicate indexes whose canonical counterparts
-- are already retained. Unused-index findings are intentionally not acted on
-- because DEV traffic statistics are not representative of production usage.

drop index if exists public.beat_license_purchases_contract_number_uidx;
drop index if exists public.community_comments_author_id_idx;
drop index if exists public.community_groups_owner_id_idx;
drop index if exists public.idx_digital_product_order_items_order;
drop index if exists public.digital_product_order_items_product_id_idx;
drop index if exists public.digital_product_order_items_seller_idx;
drop index if exists public.idx_digital_product_orders_buyer;
drop index if exists public.seller_products_seller_status_idx;
drop index if exists public.student_favorites_beat_id_idx;
drop index if exists public.student_favorites_content_id_idx;
drop index if exists public.student_favorites_course_id_idx;
drop index if exists public.student_favorites_beat_unique;
drop index if exists public.student_favorites_content_unique;
drop index if exists public.student_favorites_course_unique;
