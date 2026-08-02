import type { UserRole } from '@/modules/auth/types/role';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';

export const DEV_IDENTITY_IDS: Record<Exclude<UserRole, 'super_admin'>, string> = {
  student: '11111111-1111-4111-8111-111111111111',
  instructor: 'c3942032-967a-4cde-b00c-22446584e699',
  producer: '22222222-2222-4222-8222-222222222222',
  affiliate: '33333333-3333-4333-8333-333333333333',
  company: '55555555-5555-4555-8555-555555555555',
  admin: '44444444-4444-4444-8444-444444444444',
};

const PATH_ROLE_RULES: Array<{ prefix: string; role: Exclude<UserRole, 'super_admin'> }> = [
  { prefix: '/instrutor', role: 'instructor' },
  { prefix: '/produtor', role: 'producer' },
  { prefix: '/afiliado', role: 'affiliate' },
  { prefix: '/empresa', role: 'company' },
  { prefix: '/admin', role: 'admin' },
  { prefix: '/aluno', role: 'student' },
];

export const resolveDevRoleFromPath = (pathname = window.location.pathname): Exclude<UserRole, 'super_admin'> =>
  PATH_ROLE_RULES.find(({ prefix }) => pathname.startsWith(prefix))?.role ?? 'student';

export const getDevIdentityId = (role: Exclude<UserRole, 'super_admin'> = resolveDevRoleFromPath()): string =>
  DEV_IDENTITY_IDS[role];

export const getEffectiveUserId = async (authenticatedUserId?: string | null): Promise<string> => {
  if (isDevAuthBypassEnabled) return getDevIdentityId();
  if (!authenticatedUserId) throw new Error('Usuário não autenticado');
  return authenticatedUserId;
};
