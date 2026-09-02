import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuthContext } from '@/app/providers/AuthProvider';
import type { UserRole } from '@/modules/auth/types/role';
import { FullScreenSpinner } from '@/shared/components/FullScreenSpinner';
import { ROUTES } from '@/shared/constants/routes';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';

export const RoleGuard = ({ allow, children }: { allow: UserRole[]; children: ReactNode }) => {
  const { capabilities, isLoading } = useAuthContext();

  if (isDevAuthBypassEnabled) return <>{children}</>;
  if (isLoading) return <FullScreenSpinner />;
  if (!allow.some((capability) => capabilities.includes(capability))) {
    return <Navigate to={ROUTES.accessDenied} replace />;
  }

  return <>{children}</>;
};
