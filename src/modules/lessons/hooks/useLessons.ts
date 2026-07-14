import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';
import { MOCK_LESSONS } from '@/shared/utils/devMockData';
import type { Lesson } from '../types/lesson';

export const useLessons = () => {
  return useQuery({
    queryKey: ['lessons'],
    queryFn: async (): Promise<Lesson[]> => {
      if (isDevAuthBypassEnabled) return MOCK_LESSONS;

      const { data, error } = await supabase
        .from('lessons')
        .select('id, title, description, video_url, duration_minutes, order_index, module_id')
        .order('order_index', { ascending: true });

      if (error) throw error;

      return (data ?? []).map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description || 'Descrição não disponível',
        video_url: lesson.video_url || '',
        videoUrl: lesson.video_url || '',
        duration: lesson.duration_minutes ? `${lesson.duration_minutes}:00` : '15:30',
        order_index: lesson.order_index,
        module_id: lesson.module_id,
      }));
    },
  });
};
