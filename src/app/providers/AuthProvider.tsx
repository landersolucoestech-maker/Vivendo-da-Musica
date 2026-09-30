import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';

import { supabase } from '@/integrations/supabase/client';
import {
  ACCOUNT_CAPABILITIES,
  type AccountCapability,
  type UserRole,
} from '@/modules/auth/types/role';
import { getDevIdentityId, resolveDevRoleFromPath } from '@/shared/utils/devIdentity';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';

interface AuthProfile {
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  role: UserRole | null;
  capabilities: AccountCapability[];
  hasCapability: (capability: AccountCapability) => boolean;
  isPlatformStaff: boolean;
  hasCompanyAccess: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const accountCapabilitySet = new Set<string>(ACCOUNT_CAPABILITIES);
const uniqueCapabilities = (items: AccountCapability[]) => [...new Set(items)];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setIsSessionLoading(false);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setIsSessionLoading(false);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user.id;
  const devRole = useMemo(() => resolveDevRoleFromPath(pathname), [pathname]);
  const effectiveProfileId = isDevAuthBypassEnabled
    ? getDevIdentityId(devRole)
    : userId ?? null;

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['auth-profile', effectiveProfileId],
    queryFn: async (): Promise<AuthProfile | null> => {
      if (!effectiveProfileId) return null;
      const { data, error } = await supabase
        .from('user_profiles')
        .select('full_name, avatar_url, role')
        .eq('user_id', effectiveProfileId)
        .maybeSingle();

      if (error) throw error;
      return data as AuthProfile | null;
    },
    enabled: Boolean(effectiveProfileId),
    staleTime: 60_000,
  });

  const { data: persistedCapabilities, isLoading: areCapabilitiesLoading } = useQuery({
    queryKey: ['auth-capabilities', userId],
    queryFn: async (): Promise<AccountCapability[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('account_capabilities')
        .select('capability')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) throw error;

      return uniqueCapabilities(
        (data ?? [])
          .map((row) => row.capability)
          .filter((capability): capability is AccountCapability =>
            accountCapabilitySet.has(capability)),
      );
    },
    enabled: Boolean(userId && !isDevAuthBypassEnabled),
    staleTime: 60_000,
  });

  const { data: persistedPlatformStaff, isLoading: isPlatformStaffLoading } = useQuery({
    queryKey: ['auth-platform-staff', userId],
    queryFn: async (): Promise<boolean> => {
      if (!userId) return false;
      const { data, error } = await supabase.rpc('is_platform_staff');
      if (error) {
        console.error('Platform staff authorization lookup failed.', error);
        throw new Error('Failed to resolve platform staff authorization.');
      }
      return data === true;
    },
    enabled: Boolean(userId && !isDevAuthBypassEnabled),
    staleTime: 60_000,
  });

  const { data: persistedCompanyAccess, isLoading: isCompanyAccessLoading } = useQuery({
    queryKey: ['auth-company-access', userId],
    queryFn: async (): Promise<boolean> => {
      if (!userId) return false;
      const { data, error } = await supabase
        .from('company_members')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(1);

      if (error) {
        console.error('Company membership authorization lookup failed.', error);
        throw new Error('Failed to resolve company membership authorization.');
      }

      return (data?.length ?? 0) > 0;
    },
    enabled: Boolean(userId && !isDevAuthBypassEnabled),
    staleTime: 60_000,
  });

  const capabilities = useMemo<AccountCapability[]>(() => {
    if (isDevAuthBypassEnabled) {
      if (accountCapabilitySet.has(devRole)) {
        const capability = devRole as AccountCapability;
        return uniqueCapabilities(capability === 'student' ? ['student'] : ['student', capability]);
      }
      return ['student'];
    }

    const active = [...(persistedCapabilities ?? [])];
    if (!active.includes('student')) active.push('student');
    return uniqueCapabilities(active);
  }, [devRole, persistedCapabilities]);

  const isPlatformStaff = isDevAuthBypassEnabled
    ? devRole === 'admin'
    : persistedPlatformStaff === true;

  const hasCompanyAccess = isDevAuthBypassEnabled
    ? devRole === 'company'
    : persistedCompanyAccess === true;

  const role = profile?.role ?? (isDevAuthBypassEnabled ? devRole : null);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    profile: profile ?? null,
    role,
    capabilities,
    hasCapability: (capability) => capabilities.includes(capability),
    isPlatformStaff,
    hasCompanyAccess,
    isLoading:
      isSessionLoading
      || (Boolean(effectiveProfileId) && isProfileLoading)
      || (Boolean(userId) && !isDevAuthBypassEnabled && (
        areCapabilitiesLoading
        || isPlatformStaffLoading
        || isCompanyAccessLoading
      )),
  }), [
    areCapabilitiesLoading,
    capabilities,
    effectiveProfileId,
    hasCompanyAccess,
    isCompanyAccessLoading,
    isPlatformStaff,
    isPlatformStaffLoading,
    isProfileLoading,
    isSessionLoading,
    profile,
    role,
    session,
    userId,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthContext must be used within AuthProvider.');
  return context;
};
