update public.beats
set preview_file_path = null,
    updated_at = now()
where is_demo = true
  and preview_file_path like 'https://www.soundhelix.com/%';
