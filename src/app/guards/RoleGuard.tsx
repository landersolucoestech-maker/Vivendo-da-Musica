import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuthContext } from '@/app/providers/AuthProvider';
import type { UserRole } from '@/modules/auth/types/role';
import { FullScreenSpinner } from '@/shared/components/FullScreenSpinner';
import { ROUTES } from '@/shared/constants/routes';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';

const isPersonalCapability = (
  value: UserRole,
): value is 'student' | 'instructor' | 'producer' | 'affiliate' =>
  value === 'student'
  || value === 'instructor'
  || value === 'producer'
  || value === 'affiliate';

export const RoleGuard = ({ allow, children }: { allow: UserRole[]; children: ReactNode }) => {
  const {
    capabilities,
    isPlatformStaff,
    hasCompanyAccess,
    isLoading,
  } = useAuthContext();

  if (isDevAuthBypassEnabled) return <>{children}</>;
  if (isLoading) return <FullScreenSpinner />;

  const isAllowed = allow.some((requirement) => {
    if (requirement === 'admin' || requirement === 'super_admin') {
      return isPlatformStaff;
    }

    if (requirement === 'company') {
      return hasCompanyAccess;
    }

    return isPersonalCapability(requirement) && capabilities.includes(requirement);
  });

  if (!isAllowed) {
    return <Navigate to={ROUTES.accessDenied} replace />;
  }

  return <>{children}</>;
};
