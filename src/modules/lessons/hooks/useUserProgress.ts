import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  completed: boolean;
  progress_percentage: number;
  watched_seconds: number;
  last_viewed_at: string;
}

const resolveProgressUserId = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user.id;

  if (isDevAuthBypassEnabled) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error || !data) throw new Error('Perfil de desenvolvimento não configurado');
    return data.user_id;
  }

  throw new Error('Usuário não autenticado');
};

export const useUserProgress = () => useQuery({
  queryKey: ['user-progress'],
  queryFn: async (): Promise<LessonProgress[]> => {
    const userId = await resolveProgressUserId();
    const { data, error } = await supabase
      .from('lesson_progress')
      .select('id, user_id, lesson_id, completed, progress_percentage, watched_seconds, last_viewed_at')
      .eq('user_id', userId)
      .order('last_viewed_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as LessonProgress[];
  },
});

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
      const userId = await resolveProgressUserId();
      const normalizedProgress = Math.min(100, Math.max(0, progressPercentage ?? (completed ? 100 : 0)));
      const { data, error } = await supabase
        .from('lesson_progress')
        .upsert(
          {
            user_id: userId,
            lesson_id: lessonId,
            completed: completed ?? normalizedProgress === 100,
            progress_percentage: normalizedProgress,
            watched_seconds: Math.max(0, watchedSeconds ?? 0),
            last_viewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,lesson_id' },
        )
        .select('id, user_id, lesson_id, completed, progress_percentage, watched_seconds, last_viewed_at')
        .single();

      if (error) throw error;
      return data as LessonProgress;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user-progress'] });
      await queryClient.invalidateQueries({ queryKey: ['student-dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['enrolled-courses'] });
    },
  });
};
