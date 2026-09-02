import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';
import { MOCK_PROFILE } from '@/shared/utils/devMockData';
import { DevPreviewNavigator } from '@/shared/components/DevPreviewNavigator';
import type { UserRole } from '@/modules/auth/types/role';

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
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(!isDevAuthBypassEnabled);

  useEffect(() => {
    if (isDevAuthBypassEnabled) {
      setSession(null);
      setIsSessionLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsSessionLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['auth-profile', userId],
    queryFn: async (): Promise<AuthProfile | null> => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('full_name, avatar_url, role')
        .eq('user_id', userId!)
        .maybeSingle();

      if (error) throw error;
      return data as AuthProfile | null;
    },
    enabled: !!userId && !isDevAuthBypassEnabled,
  });

  const fallbackProfile = isDevAuthBypassEnabled && !session ? MOCK_PROFILE : null;

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    profile: profile ?? fallbackProfile,
    role: profile?.role ?? fallbackProfile?.role ?? null,
    isLoading: isDevAuthBypassEnabled ? false : isSessionLoading || (!!userId && isProfileLoading),
  };

  return (
    <AuthContext.Provider value={value}>
      <DevPreviewNavigator />
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
};
