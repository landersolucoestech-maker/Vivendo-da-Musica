import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import type { Lesson } from '@/modules/lessons/types/lesson';

const formatDuration = (minutes: number | null) => {
  const safeMinutes = Math.max(0, minutes ?? 0);
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;
  return hours > 0 ? `${hours}:${String(remainingMinutes).padStart(2, '0')}:00` : `${remainingMinutes}:00`;
};

export const useLessons = () => useQuery({
  queryKey: ['lessons'],
  queryFn: async (): Promise<Lesson[]> => {
    const { data, error } = await supabase
      .from('lessons')
      .select('id, title, description, video_url, duration_minutes, order_index, module_id')
      .order('module_id', { ascending: true })
      .order('order_index', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      description: lesson.description ?? '',
      video_url: lesson.video_url ?? '',
      videoUrl: lesson.video_url ?? '',
      duration: formatDuration(lesson.duration_minutes),
      order_index: lesson.order_index,
      module_id: lesson.module_id,
    }));
  },
});
