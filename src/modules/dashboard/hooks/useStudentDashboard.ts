import { useMemo } from 'react';

import { useAuthContext } from '@/app/providers/AuthProvider';
import { useRecentCertificates } from '@/modules/certificates/hooks/useCertificates';
import { useUnreadNotificationsCount } from '@/modules/dashboard/hooks/useNotifications';
import { useProgressCalculation } from '@/modules/lessons/hooks/useProgressCalculation';
import { useRecommendedDownloads } from '@/modules/marketplace/hooks/useDownloads';
import { useModules } from '@/modules/modules-manager/hooks/useModules';

export const useStudentDashboard = () => {
  const { user, profile } = useAuthContext();
  const { data: modules } = useModules();
  const modulesWithProgress = useProgressCalculation(modules);
  const { data: unreadNotifications = 0 } = useUnreadNotificationsCount();
  const { data: recentCertificates = [] } = useRecentCertificates(2);
  const { data: recommendedDownloads = [] } = useRecommendedDownloads(2);

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email || 'Estudante';
  const firstName = displayName.split(' ')[0];
  const joinDate = user?.created_at
    ? new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(new Date(user.created_at))
    : '—';

  const totalLessons = modulesWithProgress.reduce((total, module) => total + module.lessons.length, 0);
  const completedLessons = modulesWithProgress.reduce(
    (total, module) => total + module.lessons.filter((lesson) => lesson.completed).length,
    0,
  );
  const remainingLessons = Math.max(0, totalLessons - completedLessons);

  const overallProgress = modulesWithProgress.length
    ? Math.round(
        modulesWithProgress.reduce((sum, module) => sum + module.progress, 0) /
          modulesWithProgress.length,
      )
    : 0;
  const normalizedProgress = Math.min(100, Math.max(0, overallProgress));

  const firstIncompleteLesson = useMemo(() => {
    for (const module of modulesWithProgress) {
      const nextLesson = module.lessons.find((lesson) => !lesson.completed);
      if (nextLesson) return nextLesson;
    }
    return undefined;
  }, [modulesWithProgress]);

  const activeModule = useMemo(
    () =>
      firstIncompleteLesson
        ? modulesWithProgress.find((module) =>
            module.lessons.some((lesson) => lesson.id === firstIncompleteLesson.id),
          )
        : undefined,
    [firstIncompleteLesson, modulesWithProgress],
  );

  return {
    activeModule,
    firstIncompleteLesson,
    firstName,
    joinDate,
    modulesWithProgress,
    normalizedProgress,
    recentCertificates,
    recommendedDownloads,
    remainingLessons,
    totalLessons,
    unreadNotifications,
  };
};
