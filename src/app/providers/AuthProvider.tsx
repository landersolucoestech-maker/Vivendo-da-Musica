import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';

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
const NAVIGATION_EVENT = 'vdm:navigation';

const getCurrentPathname = () => (typeof window === 'undefined' ? '/' : window.location.pathname);

const useCurrentPathname = () => {
  const [pathname, setPathname] = useState(getCurrentPathname);

  useEffect(() => {
    const updatePathname = () => setPathname(getCurrentPathname());
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function pushState(...args) {
      originalPushState.apply(this, args);
      window.dispatchEvent(new Event(NAVIGATION_EVENT));
    };

    window.history.replaceState = function replaceState(...args) {
      originalReplaceState.apply(this, args);
      window.dispatchEvent(new Event(NAVIGATION_EVENT));
    };

    window.addEventListener('popstate', updatePathname);
    window.addEventListener(NAVIGATION_EVENT, updatePathname);

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', updatePathname);
      window.removeEventListener(NAVIGATION_EVENT, updatePathname);
    };
  }, []);

  return pathname;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const pathname = useCurrentPathname();
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setIsSessionLoading(false);
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

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    profile: profile ?? null,
    role: profile?.role ?? (isDevAuthBypassEnabled ? devRole : null),
    isLoading: isSessionLoading || (Boolean(effectiveProfileId) && isProfileLoading),
  }), [devRole, effectiveProfileId, isProfileLoading, isSessionLoading, profile, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthContext deve ser utilizado dentro de AuthProvider');
  return context;
};
