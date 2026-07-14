import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { ROUTES } from '@/shared/constants/routes';
import { FullScreenSpinner } from '@/shared/components/FullScreenSpinner';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { session, isLoading } = useAuthContext();

  if (isDevAuthBypassEnabled) return <>{children}</>;
  if (isLoading) return <FullScreenSpinner />;
  if (!session) return <Navigate to={ROUTES.login} replace />;

  return <>{children}</>;
};
