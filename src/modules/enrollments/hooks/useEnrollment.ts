import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Resolves "is the current user allowed to see this lesson" by relying on
 * RLS itself: `lessons` SELECT is gated by `is_enrolled()`/`is_course_staff()`
 * at the database level, so a returned row IS the authorization proof —
 * there is no separate enrollment check to keep in sync here.
 */
export const useEnrollmentForLesson = (lessonId: string) => {
  return useQuery({
    queryKey: ['lesson-access', lessonId],
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from('lessons')
        .select('id')
        .eq('id', lessonId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!lessonId,
  });
};
