import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';
import { MOCK_LESSON_FILE } from '@/shared/utils/devMockData';

export interface LessonFile {
  id: string;
  lesson_id: string;
  samples_file_path: string | null;
  project_file_path: string | null;
  created_at: string;
  updated_at: string;
}

export const useLessonFiles = (lessonId: string) => {
  return useQuery({
    queryKey: ['lesson-files', lessonId],
    queryFn: async (): Promise<LessonFile | null> => {
      if (isDevAuthBypassEnabled) return { ...MOCK_LESSON_FILE, lesson_id: lessonId };

      const { data, error } = await supabase
        .from('lesson_files')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(`Erro ao buscar arquivos: ${error.message}`);
      return data;
    },
    enabled: !!lessonId,
  });
};

/**
 * Lesson files live in private storage buckets. The anon/authenticated role
 * has no storage SELECT policy on them, so a signed URL must be minted
 * server-side by the get-signed-lesson-url Edge Function, which re-checks
 * enrollment via RLS before issuing it.
 */
export const downloadLessonFile = async (
  lessonId: string,
  fileKind: 'samples' | 'project',
  fileName: string
) => {
  if (isDevAuthBypassEnabled) {
    // No real session to ask the Edge Function for a signed URL with.
    // Simulate success so the UI flow (toasts, disabled states) can be tested.
    return;
  }

  const { data, error } = await supabase.functions.invoke('get-signed-lesson-url', {
    body: { lessonId, fileKind },
  });

  if (error) throw new Error(`Erro ao gerar link de download: ${error.message}`);
  if (!data?.url) throw new Error('Link de download não disponível');

  const link = document.createElement('a');
  link.href = data.url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
