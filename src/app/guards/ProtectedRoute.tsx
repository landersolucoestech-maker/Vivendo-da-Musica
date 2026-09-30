import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuthContext } from '@/app/providers/AuthProvider';
import { FullScreenSpinner } from '@/shared/components/FullScreenSpinner';
import { ROUTES } from '@/shared/constants/routes';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const { session, isLoading } = useAuthContext();

  if (isDevAuthBypassEnabled) return <>{children}</>;
  if (isLoading) return <FullScreenSpinner />;
  if (!session) return <Navigate to={ROUTES.login} state={{ from: location.pathname }} replace />;

  return <>{children}</>;
};
