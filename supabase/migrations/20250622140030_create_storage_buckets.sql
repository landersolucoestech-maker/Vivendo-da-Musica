
-- Create storage buckets for lesson files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('lesson-samples', 'lesson-samples', true, 104857600, ARRAY['application/zip', 'application/x-zip-compressed']::text[]),
  ('lesson-projects', 'lesson-projects', true, 52428800, ARRAY['application/octet-stream', 'text/plain']::text[]);

-- Create storage policies for lesson-samples bucket
CREATE POLICY "Allow public read access to lesson samples"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'lesson-samples');

CREATE POLICY "Allow authenticated users to upload lesson samples"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'lesson-samples');

CREATE POLICY "Allow authenticated users to update lesson samples"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'lesson-samples');

CREATE POLICY "Allow authenticated users to delete lesson samples"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'lesson-samples');

-- Create storage policies for lesson-projects bucket
CREATE POLICY "Allow public read access to lesson projects"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'lesson-projects');

CREATE POLICY "Allow authenticated users to upload lesson projects"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'lesson-projects');

CREATE POLICY "Allow authenticated users to update lesson projects"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'lesson-projects');

CREATE POLICY "Allow authenticated users to delete lesson projects"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'lesson-projects');
