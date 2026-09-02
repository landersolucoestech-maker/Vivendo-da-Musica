import { supabase } from '@/integrations/supabase/client';
import { getActiveCompanyId } from '@/modules/company/services/companyContext.service';
import type { CompanyCreditBalance } from '@/modules/company/types/company.types';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';

const table = supabase.from as unknown as (name: string) => any;

const getPreviewBalanceFromLedger = async (companyId: string): Promise<number> => {
  if (!isDevAuthBypassEnabled) return 0;

  const { data, error } = await table('company_credit_events')
    .select('balance_after')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Não foi possível reconciliar o saldo demonstrativo: ${error.message}`);
  }

  return Number(data?.balance_after ?? 0);
};

export const companyCreditsService = {
  async getBalance(): Promise<CompanyCreditBalance> {
    const companyId = await getActiveCompanyId();
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
    const lotBalance = activeLots.reduce(
      (total: number, lot: { remaining_credits: number }) => total + Number(lot.remaining_credits ?? 0),
      0,
    );

    return {
      availableCredits: lotBalance > 0 ? lotBalance : await getPreviewBalanceFromLedger(companyId),
      nextExpirationAt: activeLots[0]?.expires_at ?? null,
    };
  },
};
