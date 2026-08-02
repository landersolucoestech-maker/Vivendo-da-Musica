import type { UserRole } from '@/modules/auth/types/role';

export type AccountProfile = Extract<UserRole, 'student' | 'producer' | 'instructor' | 'company' | 'affiliate'>;

export type AuthMode = 'login' | 'register';

export interface AccountProfileDefinition {
  value: AccountProfile;
  slug: 'aluno' | 'produtor' | 'instrutor' | 'empresa' | 'afiliado';
  label: string;
  selectorDescription: string;
  loginTitle: string;
  loginDescription: string;
  registerTitle: string;
  registerDescription: string;
}
