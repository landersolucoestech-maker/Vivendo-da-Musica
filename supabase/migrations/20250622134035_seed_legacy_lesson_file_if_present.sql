INSERT INTO public.lesson_files (aula_id, samples_file_path, project_file_path)
SELECT
  aula.id,
  'test-samples/exemplo-samples-loops.zip',
  'test-projects/exemplo-projeto-ableton.als'
FROM public.aulas aula
WHERE aula.id = '1c136523-3b58-4cc3-ba5b-aa03f4a4e081'::uuid
  AND NOT EXISTS (
    SELECT 1
    FROM public.lesson_files existing
    WHERE existing.aula_id = aula.id
      AND existing.samples_file_path = 'test-samples/exemplo-samples-loops.zip'
      AND existing.project_file_path = 'test-projects/exemplo-projeto-ableton.als'
  );
