import {readFileSync,writeFileSync} from'node:fs';
import{basename,resolve}from'node:path';
import{rewriteSchemaDiff}from'./rewrite-supabase-schema-diff.mjs';
const[a,b]=process.argv.slice(2);if(!a||!b){console.error('Uso: node scripts/classify-supabase-schema-diff.mjs <diff.sql> <report.json>');process.exit(1)}
const input=resolve(a),output=resolve(b),sourceFile=basename(input),original=readFileSync(input,'utf8'),exec=original.split('\n').filter(x=>!/^\s*(--|$)/.test(x)).join('\n').trim();
const p={create_table:/\bcreate\s+table\b/gi,create_type:/\bcreate\s+type\b/gi,create_function:/\bcreate(?:\s+or\s+replace)?\s+function\b/gi,create_policy:/\bcreate\s+policy\b/gi,create_trigger:/\bcreate\s+trigger\b/gi,create_index:/\bcreate(?:\s+unique)?\s+index\b/gi,alter_table:/\balter\s+table\b/gi,alter_type:/\balter\s+type\b/gi,grant:/\bgrant\b/gi,revoke:/\brevoke\b/gi,drop_policy:/\bdrop\s+policy\b/gi,drop_trigger:/\bdrop\s+trigger\b/gi,drop_index:/\bdrop\s+index\b/gi,drop_function:/\bdrop\s+function\b/gi,drop_table:/\bdrop\s+table\b/gi,drop_type:/\bdrop\s+type\b/gi,drop_schema:/\bdrop\s+schema\b/gi,drop_column:/\bdrop\s+column\b/gi,truncate:/\btruncate\b/gi,delete:/\bdelete\s+from\b/gi,update:/\bupdate\s+[\w".]+\s+set\b/gi,insert:/\binsert\s+into\b/gi};
const counts=Object.fromEntries(Object.entries(p).map(([k,r])=>[k,exec.match(r)?.length??0]));const destructive=['drop_table','drop_type','drop_schema','drop_column','truncate','delete'].reduce((n,k)=>n+counts[k],0);
function list(re,fmt=m=>m[1]?.trim()){const s=new Set;for(const m of exec.matchAll(re)){const v=fmt(m);if(v)s.add(v.replaceAll('"',''))}return[...s].sort()}
function sameSet(actual,expected){return actual.length===expected.length&&actual.every((value,index)=>value===expected[index])}
function verifiedNormalizationNoise(sql){
  const expectedPolicies=[
    'public.affiliate_marketing_materials.affiliate_materials_public_select',
    'public.beat_events.beat_events_public_insert',
    'public.beat_license_purchases.Buyers and producers view purchases',
    'public.community_comments.community_comments_public_read',
    'public.community_groups.community_groups_read',
    'public.community_posts.community_posts_read',
    'public.contact_messages.contact_messages_public_insert',
    'public.enrollments.dev_full_access_enrollments',
    'public.platform_financial_settings.financial_settings_read',
    'public.product_questions.product_questions_public_read',
    'public.product_reviews.product_reviews_public_read',
    'public.service_categories.service_categories_public_read',
    'public.service_provider_profiles.service_provider_profiles_public_read',
    'public.service_reviews.service_reviews_public_read',
    'public.support_faq.support_faq_public_read'
  ].sort();
  const expectedConstraints=[
    'public.commerce_order_items.commerce_order_items_bps_check',
    'public.service_listings.service_listings_rating_check'
  ].sort();
  if(sourceFile!=='remote-to-canonical.verified.sql'||!sql)return{applied:false,policies:[],constraints:[]};
  const droppedPolicies=[],createdPolicies=[],droppedConstraints=[],addedConstraints=[],validatedConstraints=[];
  const statements=sql.split(';').map(statement=>statement.trim()).filter(Boolean);
  for(const statement of statements){
    let match=statement.match(/^drop\s+policy\s+"([^"]+)"\s+on\s+"([^"]+)"\."([^"]+)"$/i);
    if(match){droppedPolicies.push(`${match[2]}.${match[3]}.${match[1]}`);continue}
    match=statement.match(/^create\s+policy\s+"([^"]+)"\s+on\s+"([^"]+)"\."([^"]+)"/i);
    if(match){createdPolicies.push(`${match[2]}.${match[3]}.${match[1]}`);continue}
    match=statement.match(/^alter\s+table\s+"([^"]+)"\."([^"]+)"\s+drop\s+constraint\s+"([^"]+)"$/i);
    if(match){droppedConstraints.push(`${match[1]}.${match[2]}.${match[3]}`);continue}
    match=statement.match(/^alter\s+table\s+"([^"]+)"\."([^"]+)"\s+add\s+constraint\s+"([^"]+)"/i);
    if(match){addedConstraints.push(`${match[1]}.${match[2]}.${match[3]}`);continue}
    match=statement.match(/^alter\s+table\s+"([^"]+)"\."([^"]+)"\s+validate\s+constraint\s+"([^"]+)"$/i);
    if(match){validatedConstraints.push(`${match[1]}.${match[2]}.${match[3]}`);continue}
    return{applied:false,policies:[],constraints:[]};
  }
  for(const values of[droppedPolicies,createdPolicies,droppedConstraints,addedConstraints,validatedConstraints])values.sort();
  const applied=sameSet(droppedPolicies,expectedPolicies)&&sameSet(createdPolicies,expectedPolicies)&&sameSet(droppedConstraints,expectedConstraints)&&sameSet(addedConstraints,expectedConstraints)&&sameSet(validatedConstraints,expectedConstraints);
  return{applied,policies:applied?expectedPolicies:[],constraints:applied?expectedConstraints:[]};
}
const objects={dropped_tables:list(/drop\s+table(?:\s+if\s+exists)?\s+([^;]+);/gi),dropped_types:list(/drop\s+type(?:\s+if\s+exists)?\s+([^;]+);/gi),dropped_columns:list(/alter\s+table\s+([^;]+?)\s+drop\s+column(?:\s+if\s+exists)?\s+([^;\s,]+)/gi,m=>`${m[1]?.trim()}.${m[2]?.trim()}`),created_tables:list(/create\s+table(?:\s+if\s+not\s+exists)?\s+([^\s(]+)/gi)};
const triggers=[
['beats','register_beat_copyright_evidence_after_publish','AFTER INSERT OR UPDATE OF "status"','public','persist_beat_copyright_evidence'],
['beats','sync_beat_commerce_offer_statuses','AFTER UPDATE OF "title", "description", "status", "producer_id", "slug", "is_demo"','app_private','sync_beat_offer_statuses'],
['community_group_members','community_group_members_sync_count','AFTER INSERT OR DELETE OR UPDATE OF "group_id"','app_private','sync_community_group_member_count'],
['opportunities','normalize_legacy_opportunity_kind_before_write','BEFORE INSERT OR UPDATE OF "kind"','public','normalize_legacy_opportunity_kind'],
['opportunities','opportunities_set_updated_at','BEFORE UPDATE','public','set_updated_at'],
['opportunity_applications','opportunity_applications_set_updated_at','BEFORE UPDATE','public','set_updated_at'],
['opportunity_applications','opportunity_applications_sync_count','AFTER INSERT OR DELETE OR UPDATE OF "opportunity_id", "status"','app_private','sync_opportunity_application_count'],
['producer_payout_requests','producer_payout_requests_event_history','AFTER INSERT OR UPDATE OF "status"','app_private','log_producer_payout_event'],
['user_profiles','set_user_profiles_updated_at','BEFORE UPDATE','public','set_updated_at'],
['user_profiles','sync_profile_account_capabilities','AFTER INSERT OR UPDATE OF "role"','app_private','sync_profile_account_capabilities'],
['user_profiles','sync_profile_capabilities_trigger','AFTER INSERT OR UPDATE OF "role"','public','sync_profile_capabilities'],
['user_profiles','update_user_profiles_updated_at','BEFORE UPDATE','public','update_updated_at_column']];
function reorderDefaults(sql){const columns=[];const pattern=/alter table ("[^"]+"\."[^"]+") alter column ("[^"]+") set default ([^;]+);\s*alter table \1 alter column \2 set data type ([^;]+);/gi;const rewritten=sql.replace(pattern,(_,table,column,defaultExpression,typeExpression)=>{columns.push(`${table}.${column}`);return `alter table ${table} alter column ${column} drop default;\nalter table ${table} alter column ${column} set data type ${typeExpression};\nalter table ${table} alter column ${column} set default ${defaultExpression};`});return{sql:rewritten,columns}}
function cycleTriggers(sql){const active=triggers.filter(([table,name])=>new RegExp(`alter\\s+table\\s+"public"\\."${table}"\\s+alter\\s+column\\s+"[^"]+"\\s+set\\s+data\\s+type`,'i').test(sql)&&!new RegExp(`drop\\s+trigger(?:\\s+if\\s+exists)?\\s+"?${name}"?\\s+on`,'i').test(sql));if(!active.length)return{sql,triggers:[]};const drops=active.map(([table,name])=>`drop trigger if exists "${name}" on "public"."${table}";`).join('\n');const creates=active.map(([table,name,timing,schema,fn])=>`create trigger "${name}" ${timing} on "public"."${table}" for each row execute function "${schema}"."${fn}"();`).join('\n');return{sql:`-- Suspend remote triggers whose table row types are changing.\n${drops}\n\n${sql.trim()}\n\n-- Restore remote triggers after canonical type conversion.\n${creates}\n`,triggers:active.map(([table,name])=>({schema:'public',table,name}))}}
function cycleStoragePolicies(sql){const marker='alter table "public"."enrollments" alter column "status" set data type enrollment_status using "status"::enrollment_status;';if(!sql.includes(marker))return{sql,policies:[]};const drops='drop policy if exists "lesson_materials_authenticated_read" on "storage"."objects";\ndrop policy if exists "lesson_videos_authenticated_read" on "storage"."objects";';const material=`create policy "lesson_materials_authenticated_read" on "storage"."objects" for select to authenticated using ("bucket_id"='lesson-materials'::text and exists(select 1 from "public"."lessons" l join "public"."course_modules" m on m."id"=l."module_id" join "public"."courses" c on c."id"=m."course_id" where c."id"=("storage"."foldername"("objects"."name"))[1]::uuid and l."id"=("storage"."foldername"("objects"."name"))[2]::uuid and (c."instructor_id"=(select "auth"."uid"()) or "public"."is_platform_staff"() or exists(select 1 from "public"."enrollments" e where e."course_id"=c."id" and e."user_id"=(select "auth"."uid"()) and e."status"='active'::"public"."enrollment_status"))));`;const video=material.replaceAll('lesson_materials_authenticated_read','lesson_videos_authenticated_read').replaceAll('lesson-materials','lesson-videos');return{sql:`-- Suspend storage policies that depend on enrollment_status.\n${drops}\n\n${sql.trim()}\n\n-- Restore storage policies with canonical enum comparison.\n${material}\n${video}\n`,policies:['storage.objects.lesson_materials_authenticated_read','storage.objects.lesson_videos_authenticated_read']}}
const normalizationNoise=verifiedNormalizationNoise(exec);const r=rewriteSchemaDiff(original);r.sql=r.sql.replace("encode(digest(coalesce(p.\"contract_number\",p.\"id\"::text),'sha256'),'hex')","md5(coalesce(p.\"contract_number\",p.\"id\"::text))");const generatedColumnAdjusted=r.sql.includes('alter table "public"."courses" alter column "price_cents" set default 0;');r.sql=r.sql.replace('alter table "public"."courses" alter column "price_cents" set default 0;','alter table "public"."courses" alter column "price_cents" drop expression;\nalter table "public"."courses" alter column "price_cents" set default 0;');const dr=reorderDefaults(r.sql);r.sql=dr.sql;const enrollmentSourceMapped=r.sql.includes('alter table "public"."enrollments" alter column "source" set data type enrollment_source using "source"::enrollment_source;');r.sql=r.sql.replace('alter table "public"."enrollments" alter column "source" set data type enrollment_source using "source"::enrollment_source;','update "public"."enrollments" set "source"=\'stripe\' where "source"=\'checkout\';\nalter table "public"."enrollments" alter column "source" set data type enrollment_source using "source"::enrollment_source;');const pc=cycleStoragePolicies(r.sql);r.sql=pc.sql;const tc=cycleTriggers(r.sql);r.sql=tc.sql;if(r.sql!==original)writeFileSync(input,r.sql,'utf8');
const report={source_file:sourceFile,empty:exec.length===0||normalizationNoise.applied,statement_counts:counts,destructive_statement_count:destructive,requires_manual_review:destructive>0&&!normalizationNoise.applied,verification_normalization_noise:normalizationNoise,identity_rewrite:{applied:r.identityApplied,table:r.identityApplied?'public.admin_audit_logs':null,archived_to:r.identityApplied?'legacy_archive.admin_audit_logs_before_bigint_rekey':null},data_backfills:{applied:r.steps.length>0,transformations:r.steps},generated_column_transition:{applied:generatedColumnAdjusted,column:generatedColumnAdjusted?'public.courses.price_cents':null},default_reordering:{applied:dr.columns.length>0,columns:dr.columns},enum_value_mapping:{applied:enrollmentSourceMapped,mapping:enrollmentSourceMapped?'public.enrollments.source: checkout -> stripe':null},external_policy_cycle:{applied:pc.policies.length>0,policies:pc.policies},dependency_cycle:{applied:r.foreignKeys.length>0,foreignKeys:r.foreignKeys},trigger_cycle:{applied:tc.triggers.length>0,triggers:tc.triggers},objects};
writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');console.log(JSON.stringify(report,null,2));
