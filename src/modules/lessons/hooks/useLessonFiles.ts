import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';

export interface LessonMaterial {
  id: string;
  lesson_id: string;
  name: string;
  description: string | null;
  material_type: string;
  file_url: string;
  mime_type: string | null;
  size_bytes: number | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export const useLessonFiles = (lessonId: string) => useQuery({
  queryKey: ['lesson-materials', lessonId],
  queryFn: async (): Promise<LessonMaterial[]> => {
    const { data, error } = await supabase
      .from('lesson_materials')
      .select('id, lesson_id, name, description, material_type, file_url, mime_type, size_bytes, order_index, created_at, updated_at')
      .eq('lesson_id', lessonId)
      .order('order_index', { ascending: true });

    if (error) throw new Error(`Erro ao buscar materiais da aula: ${error.message}`);
    return (data ?? []) as LessonMaterial[];
  },
  enabled: !!lessonId,
});

export const downloadLessonMaterial = (material: LessonMaterial) => {
  const url = new URL(material.file_url);
  if (url.hostname.endsWith('.test')) {
    throw new Error('Este material é sintético e ainda não possui um arquivo real armazenado.');
  }

  const link = document.createElement('a');
  link.href = material.file_url;
  link.download = material.name;
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
