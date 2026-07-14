import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';
import { MOCK_PROGRESS } from '@/shared/utils/devMockData';

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  completed: boolean;
  progress_percentage: number;
  watched_seconds: number;
  last_viewed_at: string;
}

export const useUserProgress = () => {
  return useQuery({
    queryKey: ['user-progress'],
    queryFn: async (): Promise<LessonProgress[]> => {
      if (isDevAuthBypassEnabled) return MOCK_PROGRESS;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data as LessonProgress[];
    },
  });
};

export const useUpdateProgress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      lessonId,
      completed,
      progressPercentage,
      watchedSeconds,
    }: {
      lessonId: string;
      completed?: boolean;
      progressPercentage?: number;
      watchedSeconds?: number;
    }) => {
      if (isDevAuthBypassEnabled) {
        return {
          id: `mock-progress-${lessonId}`,
          user_id: 'mock-user',
          lesson_id: lessonId,
          completed: completed ?? false,
          progress_percentage: progressPercentage ?? 0,
          watched_seconds: watchedSeconds ?? 0,
          last_viewed_at: new Date().toISOString(),
        };
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('lesson_progress')
        .upsert(
          {
            user_id: user.id,
            lesson_id: lessonId,
            completed: completed ?? false,
            progress_percentage: progressPercentage ?? 0,
            watched_seconds: watchedSeconds ?? 0,
            last_viewed_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,lesson_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-progress'] });
    },
  });
};
