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

export const ACCOUNT_CAPABILITIES = [
  'student',
  'instructor',
  'producer',
  'affiliate',
] as const;

export type AccountCapability = (typeof ACCOUNT_CAPABILITIES)[number];

export const PLATFORM_STAFF_ROLES = ['admin', 'super_admin'] as const;
export type PlatformStaffRole = (typeof PLATFORM_STAFF_ROLES)[number];
