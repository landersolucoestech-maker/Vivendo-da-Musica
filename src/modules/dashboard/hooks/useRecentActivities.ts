import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';
import { MOCK_ACTIVITIES } from '@/shared/utils/devMockData';

export interface RecentActivity {
  activity: string;
  time: string;
  type: 'lesson_completed' | 'lesson_started' | 'module_progress';
}

export const useRecentActivities = () => {
  return useQuery({
    queryKey: ['recent-activities'],
    queryFn: async (): Promise<RecentActivity[]> => {
      if (isDevAuthBypassEnabled) return MOCK_ACTIVITIES;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: progressData, error } = await supabase
        .from('lesson_progress')
        .select(
          `
          *,
          lessons (
            title,
            module_id,
            course_modules (
              title
            )
          )
        `
        )
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return (progressData ?? []).map((progress) => {
        const lessonTitle = progress.lessons?.title || 'Aula sem título';
        const moduleTitle = progress.lessons?.course_modules?.title || 'Módulo';

        const updatedAt = new Date(progress.updated_at);
        const diffInHours = Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60));
        const diffInDays = Math.floor(diffInHours / 24);

        const time =
          diffInHours < 1
            ? 'Há alguns minutos'
            : diffInHours < 24
              ? `${diffInHours} hora${diffInHours > 1 ? 's' : ''} atrás`
              : `${diffInDays} dia${diffInDays > 1 ? 's' : ''} atrás`;

        let activity: string;
        let type: RecentActivity['type'];
        if (progress.completed) {
          activity = `Completou "${lessonTitle}" em ${moduleTitle}`;
          type = 'lesson_completed';
        } else if (progress.progress_percentage > 0) {
          activity = `Assistiu ${progress.progress_percentage}% de "${lessonTitle}"`;
          type = 'lesson_started';
        } else {
          activity = `Iniciou "${lessonTitle}" em ${moduleTitle}`;
          type = 'lesson_started';
        }

        return { activity, time, type };
      });
    },
  });
};
