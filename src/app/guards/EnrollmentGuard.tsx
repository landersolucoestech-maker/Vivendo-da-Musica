import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useEnrollmentForLesson } from '@/modules/enrollments/hooks/useEnrollment';
import { ROUTES } from '@/shared/constants/routes';
import { FullScreenSpinner } from '@/shared/components/FullScreenSpinner';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';

export const EnrollmentGuard = ({ lessonId, children }: { lessonId: string; children: ReactNode }) => {
  const { data: isEnrolled, isLoading } = useEnrollmentForLesson(lessonId);

  if (isDevAuthBypassEnabled) return <>{children}</>;
  if (isLoading) return <FullScreenSpinner />;
  if (!isEnrolled) return <Navigate to={ROUTES.comingSoon} replace />;

  return <>{children}</>;
};
