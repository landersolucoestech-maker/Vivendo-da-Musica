import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuthContext } from '@/app/providers/AuthProvider';
import { FullScreenSpinner } from '@/shared/components/FullScreenSpinner';
import { ROUTES } from '@/shared/constants/routes';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';
import type { UserRole } from '@/modules/auth/types/role';

const STAFF_ROLES: UserRole[] = ['admin', 'super_admin'];

const allowedRolesForPath = (pathname: string): UserRole[] | null => {
  if (pathname === '/aluno' || pathname.startsWith('/aluno/')) return ['student', ...STAFF_ROLES];
  if (pathname === '/instrutor' || pathname.startsWith('/instrutor/')) return ['instructor', ...STAFF_ROLES];
  if (pathname === '/produtor' || pathname.startsWith('/produtor/')) return ['producer', ...STAFF_ROLES];
  if (pathname === '/afiliado' || pathname.startsWith('/afiliado/')) return ['affiliate', ...STAFF_ROLES];
  if (pathname === '/empresa' || pathname.startsWith('/empresa/')) return ['company', ...STAFF_ROLES];
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return STAFF_ROLES;
  return null;
};

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const { session, role, isLoading } = useAuthContext();

  if (isDevAuthBypassEnabled) return <>{children}</>;
  if (isLoading) return <FullScreenSpinner />;
  if (!session) return <Navigate to={ROUTES.login} state={{ from: location.pathname }} replace />;

  const allowedRoles = allowedRolesForPath(location.pathname);
  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    return <Navigate to={ROUTES.accessDenied} replace />;
  }

  return <>{children}</>;
};
