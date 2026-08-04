import { supabase } from '@/integrations/supabase/client';
import type { CompanyCreditBalance } from '@/modules/company/types/company.types';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';
import { getEffectiveUserId } from '@/shared/utils/devIdentity';

const table = supabase.from as unknown as (name: string) => any;

const getUserId = async (): Promise<string> => {
  const { data, error } = await supabase.auth.getUser();
  if (error && !isDevAuthBypassEnabled) {
    throw new Error('Entre com uma conta empresarial para consultar os créditos de publicação.');
  }

  return getEffectiveUserId(data.user?.id ?? null);
};

const getCompanyId = async (): Promise<string> => {
  const userId = await getUserId();
  const { data, error } = await table('company_members')
    .select('company_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    throw new Error(`Não foi possível identificar a empresa para consultar os créditos: ${error.message}`);
  }
  if (!data?.company_id) {
    throw new Error('Esta conta ainda não está vinculada a uma empresa ativa.');
  }

  return data.company_id;
};

export const companyCreditsService = {
  async getBalance(): Promise<CompanyCreditBalance> {
    const companyId = await getCompanyId();
    const now = new Date().toISOString();
    const { data, error } = await table('company_credit_lots')
      .select('remaining_credits, expires_at')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .gt('remaining_credits', 0)
      .gt('expires_at', now)
      .order('expires_at', { ascending: true });

    if (error) {
      throw new Error(`Não foi possível carregar o saldo de vagas: ${error.message}`);
    }

    const activeLots = data ?? [];
    return {
      availableCredits: activeLots.reduce(
        (total: number, lot: { remaining_credits: number }) => total + Number(lot.remaining_credits ?? 0),
        0,
      ),
      nextExpirationAt: activeLots[0]?.expires_at ?? null,
    };
  },
};
