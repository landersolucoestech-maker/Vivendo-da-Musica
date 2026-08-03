begin;

create or replace function app_private.upsert_commerce_offer(
  target_resource_type text,
  target_resource_id uuid,
  target_seller_id uuid,
  target_title text,
  target_description text,
  target_status text,
  target_currency text,
  target_amount_cents bigint,
  target_compare_at_cents bigint,
  target_is_demo boolean,
  target_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  offer_id uuid;
  current_price public.commerce_offer_prices;
  next_version integer;
  normalized_status text;
begin
  normalized_status := case when target_status = 'active' then 'active' when target_status = 'archived' then 'archived' else 'draft' end;

  insert into public.commerce_offers (
    resource_type, resource_id, seller_id, title, description, status, currency, metadata, is_demo
  ) values (
    target_resource_type,
    target_resource_id,
    target_seller_id,
    trim(target_title),
    nullif(trim(coalesce(target_description, '')), ''),
    normalized_status,
    upper(target_currency),
    coalesce(target_metadata, '{}'::jsonb),
    target_is_demo
  )
  on conflict (resource_type, resource_id) do update
  set seller_id = excluded.seller_id,
      title = excluded.title,
      description = excluded.description,
      status = excluded.status,
      currency = excluded.currency,
      metadata = public.commerce_offers.metadata || excluded.metadata,
      is_demo = excluded.is_demo,
      updated_at = now()
  returning id into offer_id;

  select * into current_price
  from public.commerce_offer_prices
  where offer_id = upsert_commerce_offer.offer_id
    and status = 'published'
    and effective_until is null
  order by version desc
  limit 1;

  if current_price.id is null
    or current_price.amount_cents is distinct from greatest(target_amount_cents, 0)
    or current_price.compare_at_cents is distinct from target_compare_at_cents
    or current_price.currency is distinct from upper(target_currency) then

    update public.commerce_offer_prices
    set status = 'archived',
        effective_until = now()
    where offer_id = upsert_commerce_offer.offer_id
      and status = 'published'
      and effective_until is null;

    select coalesce(max(version), 0) + 1
    into next_version
    from public.commerce_offer_prices
    where offer_id = upsert_commerce_offer.offer_id;

    insert into public.commerce_offer_prices (
      offer_id,
      version,
      amount_cents,
      compare_at_cents,
      currency,
      status,
      effective_from,
      commercial_snapshot,
      published_at
    ) values (
      offer_id,
      next_version,
      greatest(target_amount_cents, 0),
      case when target_compare_at_cents is not null and target_compare_at_cents >= greatest(target_amount_cents, 0) then target_compare_at_cents else null end,
      upper(target_currency),
      'published',
      now(),
      jsonb_build_object(
        'source', 'resource_sync',
        'resourceType', target_resource_type,
        'resourceId', target_resource_id,
        'capturedAt', now()
      ),
      now()
    );
  end if;

  return offer_id;
end;
$$;

revoke all on function app_private.upsert_commerce_offer(text,uuid,uuid,text,text,text,text,bigint,bigint,boolean,jsonb) from public;
grant execute on function app_private.upsert_commerce_offer(text,uuid,uuid,text,text,text,text,bigint,bigint,boolean,jsonb) to service_role;

create or replace function app_private.sync_course_offer()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform app_private.upsert_commerce_offer(
    'course', new.id, new.instructor_id, new.title, new.description,
    case when new.status::text = 'published' then 'active' when new.status::text = 'archived' then 'archived' else 'draft' end,
    new.currency, coalesce(new.price_cents, 0), nullif(new.original_price_cents, 0), new.is_demo,
    jsonb_build_object('category', new.category, 'slug', new.slug)
  );
  return new;
end;
$$;

create or replace function app_private.sync_product_offer()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform app_private.upsert_commerce_offer(
    'digital_product', new.id, new.seller_id, new.title, new.description,
    case when new.status = 'published' then 'active' when new.status = 'archived' then 'archived' else 'draft' end,
    new.currency, new.price_cents, null, new.is_demo,
    jsonb_build_object('productType', new.product_type, 'slug', new.slug)
  );
  return new;
end;
$$;

create or replace function app_private.sync_beat_license_offer()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  beat public.beats;
begin
  select * into beat from public.beats where id = new.beat_id;
  if beat.id is null then return new; end if;

  perform app_private.upsert_commerce_offer(
    'beat_license', new.id, beat.producer_id, beat.title || ' — ' || new.name, beat.description,
    case when new.available and beat.status = 'published' then 'active' when beat.status = 'archived' then 'archived' else 'draft' end,
    new.currency, new.price_cents, null, beat.is_demo,
    jsonb_build_object(
      'beatId', beat.id,
      'beatSlug', beat.slug,
      'licenseType', new.license_type,
      'isExclusive', new.is_exclusive,
      'deliverables', new.deliverables,
      'usageRights', new.usage_rights,
      'maxCopies', new.max_copies
    )
  );
  return new;
end;
$$;

create or replace function app_private.sync_beat_offer_statuses()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  license public.beat_licenses;
begin
  for license in select * from public.beat_licenses where beat_id = new.id loop
    perform app_private.upsert_commerce_offer(
      'beat_license', license.id, new.producer_id, new.title || ' — ' || license.name, new.description,
      case when license.available and new.status = 'published' then 'active' when new.status = 'archived' then 'archived' else 'draft' end,
      license.currency, license.price_cents, null, new.is_demo,
      jsonb_build_object(
        'beatId', new.id,
        'beatSlug', new.slug,
        'licenseType', license.license_type,
        'isExclusive', license.is_exclusive,
        'deliverables', license.deliverables,
        'usageRights', license.usage_rights,
        'maxCopies', license.max_copies
      )
    );
  end loop;
  return new;
end;
$$;

create or replace function app_private.sync_job_credit_pack_offer()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform app_private.upsert_commerce_offer(
    'job_credit_pack', new.id, null, new.name, new.description,
    case when new.active then 'active' else 'archived' end,
    new.currency, new.price_cents, null, new.is_demo,
    jsonb_build_object('code', new.code, 'creditQuantity', new.credit_quantity, 'validityDays', new.validity_days)
  );
  return new;
end;
$$;

revoke all on function app_private.sync_course_offer() from public;
revoke all on function app_private.sync_product_offer() from public;
revoke all on function app_private.sync_beat_license_offer() from public;
revoke all on function app_private.sync_beat_offer_statuses() from public;
revoke all on function app_private.sync_job_credit_pack_offer() from public;

drop trigger if exists sync_course_commerce_offer on public.courses;
create trigger sync_course_commerce_offer
after insert or update of title, description, status, currency, price_cents, original_price_cents, instructor_id, category, slug, is_demo
on public.courses for each row execute function app_private.sync_course_offer();

drop trigger if exists sync_product_commerce_offer on public.seller_products;
create trigger sync_product_commerce_offer
after insert or update of title, description, status, currency, price_cents, seller_id, product_type, slug, is_demo
on public.seller_products for each row execute function app_private.sync_product_offer();

drop trigger if exists sync_beat_license_commerce_offer on public.beat_licenses;
create trigger sync_beat_license_commerce_offer
after insert or update of name, license_type, price_cents, currency, deliverables, usage_rights, max_copies, is_exclusive, available
on public.beat_licenses for each row execute function app_private.sync_beat_license_offer();

drop trigger if exists sync_beat_commerce_offer_statuses on public.beats;
create trigger sync_beat_commerce_offer_statuses
after update of title, description, status, producer_id, slug, is_demo
on public.beats for each row execute function app_private.sync_beat_offer_statuses();

drop trigger if exists sync_job_credit_pack_commerce_offer on public.job_credit_packs;
create trigger sync_job_credit_pack_commerce_offer
after insert or update of name, description, credit_quantity, price_cents, currency, validity_days, active, code, is_demo
on public.job_credit_packs for each row execute function app_private.sync_job_credit_pack_offer();

insert into public.commerce_offers (resource_type,resource_id,seller_id,title,description,status,currency,metadata,is_demo)
select 'course',course.id,course.instructor_id,course.title,course.description,
  case when course.status::text='published' then 'active' when course.status::text='archived' then 'archived' else 'draft' end,
  course.currency,jsonb_build_object('category',course.category,'slug',course.slug),course.is_demo
from public.courses course
on conflict (resource_type,resource_id) do update
set seller_id=excluded.seller_id,title=excluded.title,description=excluded.description,status=excluded.status,currency=excluded.currency,metadata=excluded.metadata,is_demo=excluded.is_demo,updated_at=now();

insert into public.commerce_offers (resource_type,resource_id,seller_id,title,description,status,currency,metadata,is_demo)
select 'digital_product',product.id,product.seller_id,product.title,product.description,
  case when product.status='published' then 'active' when product.status='archived' then 'archived' else 'draft' end,
  product.currency,jsonb_build_object('productType',product.product_type,'slug',product.slug),product.is_demo
from public.seller_products product
on conflict (resource_type,resource_id) do update
set seller_id=excluded.seller_id,title=excluded.title,description=excluded.description,status=excluded.status,currency=excluded.currency,metadata=excluded.metadata,is_demo=excluded.is_demo,updated_at=now();

insert into public.commerce_offers (resource_type,resource_id,seller_id,title,description,status,currency,metadata,is_demo)
select 'beat_license',license.id,beat.producer_id,beat.title || ' — ' || license.name,beat.description,
  case when license.available and beat.status='published' then 'active' when beat.status='archived' then 'archived' else 'draft' end,
  license.currency,jsonb_build_object('beatId',beat.id,'beatSlug',beat.slug,'licenseType',license.license_type,'isExclusive',license.is_exclusive,'deliverables',license.deliverables,'usageRights',license.usage_rights,'maxCopies',license.max_copies),beat.is_demo
from public.beat_licenses license join public.beats beat on beat.id=license.beat_id
on conflict (resource_type,resource_id) do update
set seller_id=excluded.seller_id,title=excluded.title,description=excluded.description,status=excluded.status,currency=excluded.currency,metadata=excluded.metadata,is_demo=excluded.is_demo,updated_at=now();

insert into public.commerce_offers (resource_type,resource_id,seller_id,title,description,status,currency,metadata,is_demo)
select 'job_credit_pack',pack.id,null,pack.name,pack.description,case when pack.active then 'active' else 'archived' end,
  pack.currency,jsonb_build_object('code',pack.code,'creditQuantity',pack.credit_quantity,'validityDays',pack.validity_days),pack.is_demo
from public.job_credit_packs pack
on conflict (resource_type,resource_id) do update
set title=excluded.title,description=excluded.description,status=excluded.status,currency=excluded.currency,metadata=excluded.metadata,is_demo=excluded.is_demo,updated_at=now();

insert into public.commerce_offer_prices (offer_id,version,amount_cents,compare_at_cents,currency,status,effective_from,commercial_snapshot,published_at)
select offer.id,1,coalesce(course.price_cents,0),case when course.original_price_cents>coalesce(course.price_cents,0) then course.original_price_cents else null end,
  course.currency,'published',coalesce(course.published_at,course.created_at),jsonb_build_object('source','resource_backfill','resourceType','course'),coalesce(course.published_at,course.created_at)
from public.commerce_offers offer join public.courses course on offer.resource_type='course' and offer.resource_id=course.id
where not exists (select 1 from public.commerce_offer_prices price where price.offer_id=offer.id);

insert into public.commerce_offer_prices (offer_id,version,amount_cents,currency,status,effective_from,commercial_snapshot,published_at)
select offer.id,1,product.price_cents,product.currency,'published',coalesce(product.published_at,product.created_at),jsonb_build_object('source','resource_backfill','resourceType','digital_product'),coalesce(product.published_at,product.created_at)
from public.commerce_offers offer join public.seller_products product on offer.resource_type='digital_product' and offer.resource_id=product.id
where not exists (select 1 from public.commerce_offer_prices price where price.offer_id=offer.id);

insert into public.commerce_offer_prices (offer_id,version,amount_cents,currency,status,effective_from,commercial_snapshot,published_at)
select offer.id,1,license.price_cents,license.currency,'published',license.created_at,jsonb_build_object('source','resource_backfill','resourceType','beat_license'),license.created_at
from public.commerce_offers offer join public.beat_licenses license on offer.resource_type='beat_license' and offer.resource_id=license.id
where not exists (select 1 from public.commerce_offer_prices price where price.offer_id=offer.id);

insert into public.commerce_offer_prices (offer_id,version,amount_cents,currency,status,effective_from,commercial_snapshot,published_at)
select offer.id,1,pack.price_cents,pack.currency,'published',pack.created_at,jsonb_build_object('source','resource_backfill','resourceType','job_credit_pack'),pack.created_at
from public.commerce_offers offer join public.job_credit_packs pack on offer.resource_type='job_credit_pack' and offer.resource_id=pack.id
where not exists (select 1 from public.commerce_offer_prices price where price.offer_id=offer.id);

commit;
