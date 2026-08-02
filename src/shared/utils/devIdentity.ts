import type { UserRole } from '@/modules/auth/types/role';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';

export const DEV_IDENTITY_IDS: Record<Exclude<UserRole, 'super_admin'>, string> = {
  student: 'bcfc5aa6-bd0b-4974-8192-a5fe29da741d',
  instructor: '38e3074a-0bf0-4c0b-b051-c583ce9d0c3b',
  producer: '97d04c14-17a0-4b51-9275-1468125b615c',
  affiliate: 'bcfc5aa6-bd0b-4974-8192-a5fe29da741d',
  admin: '38e3074a-0bf0-4c0b-b051-c583ce9d0c3b',
};

const PATH_ROLE_RULES: Array<{ prefix: string; role: Exclude<UserRole, 'super_admin'> }> = [
  { prefix: '/instrutor', role: 'instructor' },
  { prefix: '/produtor', role: 'producer' },
  { prefix: '/afiliado', role: 'affiliate' },
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
