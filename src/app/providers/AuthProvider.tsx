import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';

import { env } from '@/app/config/env';
import { supabase } from '@/integrations/supabase/client';
import type { UserRole } from '@/modules/auth/types/role';
import { getDevIdentityId, resolveDevRoleFromPath } from '@/shared/utils/devIdentity';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';

interface AuthProfile {
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
}

interface CapabilityRow {
  capability: UserRole;
  status: 'pending' | 'active' | 'suspended' | 'rejected';
  is_default: boolean;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  role: UserRole | null;
  capabilities: UserRole[];
  hasCapability: (capability: UserRole) => boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const uniqueCapabilities = (items: UserRole[]) => [...new Set(items)];

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
  const effectiveProfileId = userId ?? (isDevAuthBypassEnabled ? getDevIdentityId(devRole) : null);

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['auth-profile', effectiveProfileId],
    queryFn: async (): Promise<AuthProfile | null> => {
      if (!effectiveProfileId) return null;
      const { data, error } = await supabase.from('user_profiles')
        .select('full_name, avatar_url, role').eq('user_id', effectiveProfileId).maybeSingle();
      if (error) throw error;
      return data as AuthProfile | null;
    },
    enabled: Boolean(effectiveProfileId),
    staleTime: 60_000,
  });

  const { data: persistedCapabilities, isLoading: areCapabilitiesLoading } = useQuery({
    queryKey: ['auth-capabilities', userId, session?.access_token],
    queryFn: async (): Promise<UserRole[]> => {
      if (!userId || !session?.access_token) return [];

      const response = await fetch(
        `${env.supabaseUrl}/rest/v1/account_capabilities?select=capability,status,is_default&user_id=eq.${encodeURIComponent(userId)}&status=eq.active`,
        {
          headers: {
            apikey: env.supabasePublishableKey,
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error('Não foi possível carregar as capacidades da conta.');
      }

      const rows = await response.json() as CapabilityRow[];
      return uniqueCapabilities(rows.map((row) => row.capability));
    },
    enabled: Boolean(userId && session?.access_token),
    staleTime: 60_000,
  });

  const capabilities = useMemo<UserRole[]>(() => {
    if (isDevAuthBypassEnabled) {
      return uniqueCapabilities(devRole === 'student' ? ['student'] : ['student', devRole]);
    }

    const active = [...(persistedCapabilities ?? [])];
    if (profile?.role && !active.includes(profile.role)) active.push(profile.role);
    if (!active.includes('student')) active.push('student');
    return uniqueCapabilities(active);
  }, [devRole, persistedCapabilities, profile?.role]);

  const role = profile?.role ?? (isDevAuthBypassEnabled ? devRole : null);
  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    profile: profile ?? null,
    role,
    capabilities,
    hasCapability: (capability) => capabilities.includes(capability),
    isLoading:
      isSessionLoading
      || (Boolean(effectiveProfileId) && isProfileLoading)
      || (Boolean(userId) && areCapabilitiesLoading),
  }), [
    areCapabilitiesLoading,
    capabilities,
    effectiveProfileId,
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
  if (!context) throw new Error('useAuthContext deve ser utilizado dentro de AuthProvider');
  return context;
};
