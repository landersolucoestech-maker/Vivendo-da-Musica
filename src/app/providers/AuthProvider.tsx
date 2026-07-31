import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';

import { supabase } from '@/integrations/supabase/client';
import type { UserRole } from '@/modules/auth/types/role';
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
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsSessionLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  const devRole = useMemo(() => resolveDevRoleFromPath(location.pathname), [location.pathname]);
  const effectiveProfileId = userId ?? (isDevAuthBypassEnabled ? getDevIdentityId(devRole) : null);

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
    enabled: !!effectiveProfileId,
  });

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    profile: profile ?? null,
    role: profile?.role ?? (isDevAuthBypassEnabled ? devRole : null),
    isLoading: isSessionLoading || (!!effectiveProfileId && isProfileLoading),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthContext deve ser utilizado dentro de AuthProvider');
  return context;
};
