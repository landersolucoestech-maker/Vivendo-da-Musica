export const USER_ROLES = [
  'student',
  'instructor',
  'producer',
  'affiliate',
  'company',
  'admin',
  'super_admin',
] as const;

export type UserRole = (typeof USER_ROLES)[number];
