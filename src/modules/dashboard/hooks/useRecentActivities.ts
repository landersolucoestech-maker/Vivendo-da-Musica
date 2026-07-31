import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import { getEffectiveUserId } from '@/shared/utils/devIdentity';

export interface RecentActivity {
  activity: string;
  time: string;
  type: 'lesson_completed' | 'lesson_started' | 'module_progress';
}

const formatRelativeTime = (value: string) => {
  const updatedAt = new Date(value);
  const diffInMinutes = Math.max(0, Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60)));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) return 'Agora';
  if (diffInMinutes < 60) return `Há ${diffInMinutes} minuto${diffInMinutes > 1 ? 's' : ''}`;
  if (diffInHours < 24) return `Há ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
  return `Há ${diffInDays} dia${diffInDays > 1 ? 's' : ''}`;
};

export const useRecentActivities = () => useQuery({
  queryKey: ['recent-activities'],
  queryFn: async (): Promise<RecentActivity[]> => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    const userId = await getEffectiveUserId(authData.user?.id);

    const { data: progressData, error } = await supabase
      .from('lesson_progress')
      .select(`
        completed,
        progress_percentage,
        updated_at,
        lessons (
          title,
          course_modules (
            title
          )
        )
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    return (progressData ?? []).map((progress) => {
      const lessonTitle = progress.lessons?.title ?? 'Aula';
      const moduleTitle = progress.lessons?.course_modules?.title ?? 'Módulo';
      const type: RecentActivity['type'] = progress.completed ? 'lesson_completed' : 'lesson_started';
      const activity = progress.completed
        ? `Concluiu “${lessonTitle}” em ${moduleTitle}`
        : progress.progress_percentage > 0
          ? `Assistiu ${progress.progress_percentage}% de “${lessonTitle}”`
          : `Iniciou “${lessonTitle}” em ${moduleTitle}`;

      return {
        activity,
        time: formatRelativeTime(progress.updated_at),
        type,
      };
    });
  },
});
