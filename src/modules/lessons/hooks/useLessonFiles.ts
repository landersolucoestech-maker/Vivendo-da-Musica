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

export type LessonMaterialsCollection = LessonMaterial[] & {
  samples_file_path?: string;
  project_file_path?: string;
};

const classifyLegacyPath = (materials: LessonMaterial[]) => ({
  samples_file_path: materials.find((material) => ['wav', 'mp3', 'audio_project'].includes(material.material_type))?.file_url,
  project_file_path: materials.find((material) => ['archive', 'document', 'pdf', 'other'].includes(material.material_type))?.file_url,
});

export const useLessonFiles = (lessonId: string) => useQuery({
  queryKey: ['lesson-materials', lessonId],
  queryFn: async (): Promise<LessonMaterialsCollection> => {
    const { data, error } = await supabase
      .from('lesson_materials')
      .select('id, lesson_id, name, description, material_type, file_url, mime_type, size_bytes, order_index, created_at, updated_at')
      .eq('lesson_id', lessonId)
      .order('order_index', { ascending: true });

    if (error) throw new Error(`Erro ao buscar materiais da aula: ${error.message}`);
    const materials = (data ?? []) as LessonMaterial[];
    return Object.assign(materials, classifyLegacyPath(materials));
  },
  enabled: Boolean(lessonId),
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

export const downloadLessonFile = async (
  lessonId: string,
  kind: 'samples' | 'project',
  fallbackName: string,
) => {
  const { data, error } = await supabase
    .from('lesson_materials')
    .select('id, lesson_id, name, description, material_type, file_url, mime_type, size_bytes, order_index, created_at, updated_at')
    .eq('lesson_id', lessonId)
    .order('order_index', { ascending: true });
  if (error) throw new Error(error.message);

  const materials = (data ?? []) as LessonMaterial[];
  const material = kind === 'samples'
    ? materials.find((item) => ['wav', 'mp3', 'audio_project'].includes(item.material_type))
    : materials.find((item) => ['archive', 'document', 'pdf', 'other'].includes(item.material_type));
  if (!material) throw new Error('Material não encontrado.');

  downloadLessonMaterial({ ...material, name: material.name || fallbackName });
};
