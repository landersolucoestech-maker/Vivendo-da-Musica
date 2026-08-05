import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import type { UserRole } from '@/modules/auth/types/role';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';
import { getDevIdentityId } from '@/shared/utils/devIdentity';

export interface UserProfile {
  id: string;
  user_id: string;
  avatar_url: string | null;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

const PROFILE_SELECT = 'user_id, full_name, avatar_url, role, created_at, updated_at';

const normalizeProfile = (profile: Omit<UserProfile, 'id'>): UserProfile => ({
  ...profile,
  id: profile.user_id,
});

const getDevelopmentProfile = async (): Promise<UserProfile | null> => {
  const developmentUserId = getDevIdentityId();
  const { data, error } = await supabase
    .from('user_profiles')
    .select(PROFILE_SELECT)
    .eq('user_id', developmentUserId)
    .maybeSingle();

  if (error) throw new Error('Erro ao buscar o perfil de desenvolvimento');
  return data ? normalizeProfile(data as Omit<UserProfile, 'id'>) : null;
};

export const useUserProfile = () => useQuery({
  queryKey: ['user-profile'],
  queryFn: async (): Promise<UserProfile | null> => {
    if (isDevAuthBypassEnabled) return getDevelopmentProfile();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('user_profiles')
      .select(PROFILE_SELECT)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw new Error('Erro ao buscar o perfil do usuário');
    return data ? normalizeProfile(data as Omit<UserProfile, 'id'>) : null;
  },
});

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ avatar_url, full_name }: { avatar_url?: string; full_name?: string }) => {
      let userId: string;

      if (isDevAuthBypassEnabled) {
        const developmentProfile = await getDevelopmentProfile();
        if (!developmentProfile) throw new Error('Perfil de desenvolvimento não configurado');
        userId = developmentProfile.user_id;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');
        userId = user.id;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .upsert(
          {
            user_id: userId,
            ...(avatar_url !== undefined ? { avatar_url } : {}),
            ...(full_name !== undefined ? { full_name } : {}),
          },
          { onConflict: 'user_id' },
        )
        .select(PROFILE_SELECT)
        .single();

      if (error) throw new Error('Erro ao atualizar perfil');
      return normalizeProfile(data as Omit<UserProfile, 'id'>);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      await queryClient.invalidateQueries({ queryKey: ['auth-profile'] });
    },
  });
};
