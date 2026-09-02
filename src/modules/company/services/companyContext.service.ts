import { supabase } from '@/integrations/supabase/client';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';
import { getEffectiveUserId } from '@/shared/utils/devIdentity';

const table = supabase.from as unknown as (name: string) => any;

interface ActiveCompanyMembership {
  company_id: string | null;
}

export const resolveSingleActiveCompanyId = (
  memberships: ActiveCompanyMembership[] | null | undefined,
): string => {
  const activeMemberships = memberships ?? [];

  if (activeMemberships.length === 0 || !activeMemberships[0]?.company_id) {
    throw new Error('Esta conta ainda não está vinculada a uma empresa ativa.');
  }

  if (activeMemberships.length > 1) {
    throw new Error('Mais de uma empresa ativa foi encontrada. Selecione uma empresa antes de continuar.');
  }

  return activeMemberships[0].company_id;
};

export const getActiveCompanyId = async (): Promise<string> => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError && !isDevAuthBypassEnabled) {
    throw new Error('Entre com uma conta empresarial para acessar os recursos da empresa.');
  }

  const userId = getEffectiveUserId(authData.user?.id ?? null);
  const { data, error } = await table('company_members')
    .select('company_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(2);

  if (error) {
    throw new Error(`Não foi possível identificar a empresa ativa: ${error.message}`);
  }

  return resolveSingleActiveCompanyId(data);
};
