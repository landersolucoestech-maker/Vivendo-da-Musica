import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import type { UserRole } from '@/modules/auth/types/role';
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

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['auth-profile', userId ?? 'development-review'],
    queryFn: async (): Promise<AuthProfile | null> => {
      let query = supabase
        .from('user_profiles')
        .select('full_name, avatar_url, role');

      if (userId) {
        query = query.eq('user_id', userId);
      } else if (isDevAuthBypassEnabled) {
        query = query.order('created_at', { ascending: true }).limit(1);
      } else {
        return null;
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data as AuthProfile | null;
    },
    enabled: !!userId || isDevAuthBypassEnabled,
  });

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    profile: profile ?? null,
    role: profile?.role ?? null,
    isLoading: isSessionLoading || ((!!userId || isDevAuthBypassEnabled) && isProfileLoading),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthContext deve ser utilizado dentro de AuthProvider');
  return context;
};
