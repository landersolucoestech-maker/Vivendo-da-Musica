create or replace function public.get_course_editor(p_course_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select case
    when auth.uid() is null or not (
      exists (
        select 1
        from public.user_profiles up
        where up.user_id = auth.uid()
          and up.role::text in ('admin','super_admin')
      )
      or c.instructor_id = auth.uid()
    ) then null
    else jsonb_build_object(
      'id', c.id,
      'title', c.title,
      'slug', c.slug,
      'shortDescription', c.summary,
      'description', c.description,
      'categoryId', c.category_id,
      'level', c.level,
      'status', c.status,
      'coverUrl', c.thumbnail_url,
      'instructorId', c.instructor_id,
      'priceAmount', c.price_amount::text,
      'promotionalPriceAmount', c.promotional_price_amount::text,
      'isFree', c.is_free,
      'currency', c.currency,
      'publishedAt', c.published_at,
      'displayOrder', c.display_order,
      'modules', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', m.id,
          'title', m.title,
          'description', m.description,
          'orderIndex', m.order_index,
          'status', m.status,
          'lessons', coalesce((
            select jsonb_agg(jsonb_build_object(
              'id', l.id,
              'title', l.title,
              'slug', l.slug,
              'description', l.description,
              'content', l.content,
              'orderIndex', l.order_index,
              'durationSeconds', coalesce(l.video_duration_seconds, l.duration_minutes * 60),
              'contentType', l.lesson_type,
              'status', l.status,
              'isPreview', l.is_preview,
              'videoProvider', l.video_provider,
              'videoUrl', l.video_url,
              'videoExternalId', l.video_external_id,
              'videoThumbnailUrl', l.video_thumbnail_url,
              'videoConfig', l.video_config
            ) order by l.order_index, l.id)
            from public.lessons l where l.module_id = m.id
          ), '[]'::jsonb)
        ) order by m.order_index, m.id)
        from public.course_modules m where m.course_id = c.id
      ), '[]'::jsonb),
      'materials', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', cm.id,
          'moduleId', cm.module_id,
          'lessonId', cm.lesson_id,
          'materialKind', cm.material_kind,
          'title', cm.title,
          'description', cm.description,
          'materialType', cm.material_type,
          'externalUrl', cm.external_url,
          'storageBucket', cm.storage_bucket,
          'storagePath', cm.storage_path,
          'fileName', cm.file_name,
          'mimeType', cm.mime_type,
          'sizeBytes', cm.size_bytes::text,
          'displayOrder', cm.display_order,
          'isRequired', cm.is_required,
          'downloadAllowed', cm.download_allowed,
          'status', cm.status
        ) order by cm.display_order, cm.id)
        from public.course_materials cm where cm.course_id = c.id
      ), '[]'::jsonb)
    )
  end
  from public.courses c
  where c.id = p_course_id;
$function$;

revoke all on function public.get_course_editor(uuid) from public, anon;
grant execute on function public.get_course_editor(uuid) to authenticated;
