import type { UserRole } from '@/modules/auth/types/role';
import { ROUTES } from '@/shared/constants/routes';

export const getPortalRoute = (role: UserRole | null | undefined): string => {
  switch (role) {
    case 'instructor': return ROUTES.instructor;
    case 'producer': return ROUTES.producer;
    case 'affiliate': return ROUTES.affiliate;
    case 'company': return ROUTES.company;
    case 'admin':
    case 'super_admin': return ROUTES.admin;
    case 'student':
    default: return ROUTES.dashboard;
  }
};
