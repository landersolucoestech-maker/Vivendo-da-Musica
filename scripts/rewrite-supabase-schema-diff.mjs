const fks=[
['candidate_profiles','candidate_profiles_user_id_fkey','FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE'],
['company_members','company_members_user_id_fkey','FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE'],
['company_profiles','company_profiles_owner_user_id_fkey','FOREIGN KEY (owner_user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE'],
['lesson_comments','lesson_comments_lesson_id_fkey','FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE'],
['lesson_materials','lesson_materials_lesson_id_fkey','FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE'],
['opportunities','opportunities_created_by_fkey','FOREIGN KEY (created_by) REFERENCES user_profiles(user_id) ON DELETE SET NULL'],
['opportunity_application_messages','opportunity_application_messages_sender_id_fkey','FOREIGN KEY (sender_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE'],
['producer_financial_accounts','producer_financial_accounts_producer_id_fkey','FOREIGN KEY (producer_id) REFERENCES user_profiles(user_id) ON DELETE RESTRICT'],
['producer_payout_events','producer_payout_events_producer_id_fkey','FOREIGN KEY (producer_id) REFERENCES user_profiles(user_id) ON DELETE RESTRICT'],
['product_questions','product_questions_answered_by_fkey','FOREIGN KEY (answered_by) REFERENCES user_profiles(user_id) ON DELETE SET NULL'],
['product_questions','product_questions_user_id_fkey','FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE'],
['product_reviews','product_reviews_user_id_fkey','FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE']];
function rep(state,name,re,value){if(re.test(state.sql)){state.sql=state.sql.replace(re,()=>value);state.steps.push(name)}}
function identity(state){const id=/alter\s+table\s+"public"\."admin_audit_logs"\s+alter\s+column\s+"id"\s+add\s+generated\s+always\s+as\s+identity\s*;/i;const type=/alter\s+table\s+"public"\."admin_audit_logs"\s+alter\s+column\s+"id"\s+set\s+data\s+type\s+bigint\s+using\s+"id"::bigint\s*;/i;if(!id.test(state.sql)||!type.test(state.sql))return false;state.sql=state.sql.replace(/alter\s+table\s+"public"\."admin_audit_logs"\s+alter\s+column\s+"id"\s+drop\s+default\s*;\s*/i,'').replace(id,'').replace(type,'');state.sql=`create schema if not exists "legacy_archive";
revoke all on schema "legacy_archive" from public, anon, authenticated;
create table if not exists "legacy_archive"."admin_audit_logs_before_bigint_rekey" as table "public"."admin_audit_logs" with data;
revoke all on "legacy_archive"."admin_audit_logs_before_bigint_rekey" from public, anon, authenticated;
alter table "public"."admin_audit_logs" drop constraint if exists "admin_audit_logs_pkey";
alter table "public"."admin_audit_logs" add column "id_bigint" bigint;
with x as(select ctid,row_number()over(order by "created_at","id")::bigint n from "public"."admin_audit_logs") update "public"."admin_audit_logs" a set "id_bigint"=x.n from x where a.ctid=x.ctid;
alter table "public"."admin_audit_logs" alter column "id_bigint" set not null;
alter table "public"."admin_audit_logs" drop column "id";
alter table "public"."admin_audit_logs" rename column "id_bigint" to "id";
alter table "public"."admin_audit_logs" alter column "id" add generated always as identity;
select setval(pg_get_serial_sequence('public.admin_audit_logs','id'),greatest(coalesce((select max("id") from "public"."admin_audit_logs"),0)+1,1),false);
alter table "public"."admin_audit_logs" add constraint "admin_audit_logs_pkey" primary key("id");

${state.sql.trim()}\n`;return true}
function data(state){
rep(state,'beat_deliveries.file_path',/alter table "public"\."beat_deliveries" add column "file_path" text not null;/i,`alter table "public"."beat_deliveries" add column "file_path" text;
update "public"."beat_deliveries" set "file_path"="storage_path" where "file_path" is null;
alter table "public"."beat_deliveries" alter column "file_path" set not null;`);
rep(state,'purchase.contract_hash',/alter table "public"\."beat_license_purchases" add column "contract_hash" text not null;/i,'alter table "public"."beat_license_purchases" add column "contract_hash" text;');
rep(state,'purchase.order_item_id',/alter table "public"\."beat_license_purchases" add column "order_item_id" uuid not null;/i,'alter table "public"."beat_license_purchases" add column "order_item_id" uuid;');
rep(state,'purchase.producer_id',/alter table "public"\."beat_license_purchases" add column "producer_id" uuid not null;/i,`alter table "public"."beat_license_purchases" add column "producer_id" uuid;
update "public"."beat_license_purchases" p set "contract_hash"=encode(digest(coalesce(p."contract_number",p."id"::text),'sha256'),'hex'),"order_item_id"=i."id","producer_id"=i."producer_id","buyer_id"=coalesce(p."buyer_id",i."buyer_id"),"license_snapshot"=jsonb_strip_nulls(jsonb_build_object('beat_id',p."beat_id",'license_id',p."license_id",'beat_title',i."beat_title_snapshot",'license_name',i."license_name_snapshot",'buyer_name',i."buyer_name_snapshot",'amount_cents',i."amount_cents",'currency',i."currency")) from "public"."beat_order_items" i where i."id"=p."beat_order_item_id";
do $x$ begin if exists(select 1 from "public"."beat_license_purchases" where "contract_hash" is null or "order_item_id" is null or "producer_id" is null or "buyer_id" is null) then raise exception 'beat purchase backfill incomplete';end if;end $x$;
alter table "public"."beat_license_purchases" alter column "contract_hash" set not null;
alter table "public"."beat_license_purchases" alter column "order_item_id" set not null;
alter table "public"."beat_license_purchases" alter column "producer_id" set not null;`);
rep(state,'beat_order_items.list_price',/alter table "public"\."beat_order_items" add column "list_price_cents" integer not null;/i,`alter table "public"."beat_order_items" add column "list_price_cents" integer;
update "public"."beat_order_items" set "list_price_cents"="amount_cents" where "list_price_cents" is null;
alter table "public"."beat_order_items" alter column "list_price_cents" set not null;`);
rep(state,'beat_orders.totals',/alter table "public"\."beat_orders" add column "subtotal_cents" integer not null default 0;/i,`alter table "public"."beat_orders" add column "subtotal_cents" integer not null default 0;
update "public"."beat_orders" set "subtotal_cents"="amount_cents"+coalesce("discount_cents",0) where "subtotal_cents"=0 and "amount_cents"<>0;`);
rep(state,'coupon.keep_reference',/alter table "public"\."coupon_redemptions" drop column "order_reference";\s*/i,'');
rep(state,'coupon.discount',/alter table "public"\."coupon_redemptions" add column "discount_cents" integer not null;/i,'alter table "public"."coupon_redemptions" add column "discount_cents" integer;');
rep(state,'coupon.order',/alter table "public"\."coupon_redemptions" add column "order_id" uuid not null;/i,'alter table "public"."coupon_redemptions" add column "order_id" uuid;');
rep(state,'coupon.backfill',/alter table "public"\."coupon_redemptions" add column "status" promotion_reservation_status not null default 'reserved'::promotion_reservation_status;/i,`alter table "public"."coupon_redemptions" add column "status" promotion_reservation_status not null default 'reserved'::promotion_reservation_status;
with r as(select cr."id" rid,o."id" oid,o."amount_cents",c."discount_type",c."discount_value",row_number()over(partition by cr."id" order by case when o."provider_reference"=cr."order_reference" then 0 when cr."order_reference" like 'DEV-ORDER-%' and o."provider"='development' then 1 else 2 end,abs(extract(epoch from(coalesce(cr."redeemed_at",o."created_at")-o."created_at"))),o."created_at" desc,o."id") n from "public"."coupon_redemptions" cr join "public"."discount_coupons" c on c."id"=cr."coupon_id" join "public"."beat_orders" o on o."buyer_id"=cr."user_id"),s as(select * from r where n=1) update "public"."coupon_redemptions" cr set "order_id"=s.oid,"discount_cents"=case when s."discount_type"='percentage' then floor(s."amount_cents"*s."discount_value"/100.0)::int when s."discount_type"='percent' then floor(s."amount_cents"*s."discount_value"/10000.0)::int when s."discount_type"='fixed' then least(s."amount_cents",s."discount_value") end,"status"=case when cr."redeemed_at" is null then 'reserved'::promotion_reservation_status else 'redeemed'::promotion_reservation_status end,"created_at"=coalesce(cr."redeemed_at",cr."created_at") from s where s.rid=cr."id";
do $x$ begin if exists(select 1 from "public"."coupon_redemptions" where "order_id" is null or "discount_cents" is null or "discount_cents"<=0 or "user_id" is null) then raise exception 'coupon backfill incomplete';end if;end $x$;
alter table "public"."coupon_redemptions" alter column "discount_cents" set not null;
alter table "public"."coupon_redemptions" alter column "order_id" set not null;
alter table "public"."coupon_redemptions" drop column "order_reference";`);
rep(state,'certificates.enrollment',/alter table "public"\."course_certificates" add column "enrollment_id" uuid not null;/i,`alter table "public"."course_certificates" add column "enrollment_id" uuid;
update "public"."course_certificates" c set "enrollment_id"=(select e."id" from "public"."enrollments" e where e."user_id"=c."user_id" and e."course_id"=c."course_id" order by e."enrolled_at",e."created_at",e."id" limit 1),"certificate_code"='VDM-'||upper(substr(md5(c."id"::text),1,16));
do $x$ begin if exists(select 1 from "public"."course_certificates" where "enrollment_id" is null) then raise exception 'certificate backfill incomplete';end if;end $x$;
alter table "public"."course_certificates" alter column "enrollment_id" set not null;`);
rep(state,'discount.enum',/alter table "public"\."discount_coupons" alter column "discount_type" set data type discount_type using "discount_type"::discount_type;/i,`update "public"."discount_coupons" set "discount_value"="discount_value"*100,"discount_type"='percent' where "discount_type"='percentage';
alter table "public"."discount_coupons" alter column "discount_type" set data type discount_type using "discount_type"::discount_type;`);
rep(state,'discount.starts_at',/alter table "public"\."discount_coupons" alter column "starts_at" set not null;/i,`update "public"."discount_coupons" set "starts_at"=coalesce("starts_at","created_at",now()) where "starts_at" is null;
alter table "public"."discount_coupons" alter column "starts_at" set not null;`);
rep(state,'courses.price',/alter table "public"\."courses" alter column "price_cents" set not null;/i,`update "public"."courses" set "price_cents"=0 where "price_cents" is null;
alter table "public"."courses" alter column "price_cents" set not null;`);
rep(state,'payout.legacy',/alter table "public"\."producer_payout_requests" add column "provider_transfer_id" text;/i,`alter table "public"."producer_payout_requests" add column "provider_transfer_id" text;
update "public"."producer_payout_requests" set "processing_at"=case when "status" in('processing','paid') then coalesce("processed_at","requested_at") else "processing_at" end,"paid_at"=case when "status"='paid' then coalesce("processed_at","requested_at") else "paid_at" end,"provider_transfer_id"=case when "status"='paid' then coalesce("provider_transfer_id",'legacy:'||"id"::text) else "provider_transfer_id" end;`);
rep(state,'support.legacy',/alter table "public"\."support_tickets" add column "resolved_at" timestamp with time zone;/i,`alter table "public"."support_tickets" add column "resolved_at" timestamp with time zone;
update "public"."support_tickets" set "ticket_code"='T-'||upper(substr(md5("id"::text),1,8)),"resolved_at"=case when "status"='resolved' then coalesce("updated_at","created_at") else null end where "ticket_code"!~'^T-[A-F0-9]{8}$' or "status"='resolved';`)}
function dependencies(state){if(!/drop\s+constraint\s+"(?:lessons|user_profiles)_pkey"\s*;/i.test(state.sql))return[];const active=fks.filter(([,c])=>!new RegExp(`drop\\s+constraint\\s+"${c}"\\s*;`,'i').test(state.sql));if(!active.length)return[];const pre=active.map(([t,c])=>`alter table "public"."${t}" drop constraint "${c}";`).join('\n');const post=active.map(([t,c,d])=>`alter table "public"."${t}" add constraint "${c}" ${d};`).join('\n');state.sql=`set local search_path=public,auth,app_private,authz_private,pg_catalog;\n${pre}\n\n${state.sql.trim()}\n\n${post}\n`;return active.map(([table,constraint])=>({schema:'public',table,constraint}))}
export function rewriteSchemaDiff(sourceSql){const state={sql:sourceSql,steps:[]};const identityApplied=identity(state);data(state);const foreignKeys=dependencies(state);return{sql:state.sql,identityApplied,steps:state.steps,foreignKeys}}
