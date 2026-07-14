import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '@/app/providers/AuthProvider';
import type { UserRole } from '@/modules/auth/types/role';
import { ROUTES } from '@/shared/constants/routes';
import { FullScreenSpinner } from '@/shared/components/FullScreenSpinner';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';

export const RoleGuard = ({ allow, children }: { allow: UserRole[]; children: ReactNode }) => {
  const { role, isLoading } = useAuthContext();

  if (isDevAuthBypassEnabled) return <>{children}</>;
  if (isLoading) return <FullScreenSpinner />;
  if (!role || !allow.includes(role)) return <Navigate to={ROUTES.accessDenied} replace />;

  return <>{children}</>;
};
