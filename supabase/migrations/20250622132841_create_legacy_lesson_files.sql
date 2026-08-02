INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-samples', 'lesson-samples', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, public = EXCLUDED.public;

INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-projects', 'lesson-projects', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, public = EXCLUDED.public;

CREATE POLICY "Lesson samples are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'lesson-samples');

CREATE POLICY "Lesson projects are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'lesson-projects');

CREATE POLICY "Authenticated users can upload lesson samples" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'lesson-samples' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload lesson projects" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'lesson-projects' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update lesson samples" ON storage.objects
FOR UPDATE USING (bucket_id = 'lesson-samples' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update lesson projects" ON storage.objects
FOR UPDATE USING (bucket_id = 'lesson-projects' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete lesson samples" ON storage.objects
FOR DELETE USING (bucket_id = 'lesson-samples' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete lesson projects" ON storage.objects
FOR DELETE USING (bucket_id = 'lesson-projects' AND auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.lesson_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aula_id UUID REFERENCES public.aulas(id) ON DELETE CASCADE,
  samples_file_path TEXT,
  project_file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.lesson_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lesson files" ON public.lesson_files
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage lesson files" ON public.lesson_files
FOR ALL USING (auth.role() = 'authenticated');

CREATE TRIGGER update_lesson_files_updated_at
  BEFORE UPDATE ON public.lesson_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
