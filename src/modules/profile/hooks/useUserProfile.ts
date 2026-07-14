import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';
import { MOCK_PROFILE } from '@/shared/utils/devMockData';
import type { UserRole } from '@/modules/auth/types/role';

export interface UserProfile {
  id: string;
  user_id: string;
  avatar_url: string | null;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export const useUserProfile = () => {
  return useQuery({
    queryKey: ['user-profile'],
    queryFn: async (): Promise<UserProfile | null> => {
      if (isDevAuthBypassEnabled) return MOCK_PROFILE;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw new Error('Erro ao buscar perfil do usuário');
      return data;
    },
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ avatar_url, full_name }: { avatar_url?: string; full_name?: string }) => {
      if (isDevAuthBypassEnabled) {
        return { ...MOCK_PROFILE, ...(avatar_url !== undefined ? { avatar_url } : {}), ...(full_name !== undefined ? { full_name } : {}) };
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('user_profiles')
        .upsert(
          {
            user_id: user.id,
            ...(avatar_url !== undefined ? { avatar_url } : {}),
            ...(full_name !== undefined ? { full_name } : {}),
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (error) throw new Error('Erro ao atualizar perfil');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['auth-profile'] });
    },
  });
};
