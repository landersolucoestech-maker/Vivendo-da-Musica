import { env } from '@/app/config/env';
import { supabase } from '@/integrations/supabase/client';
import { canonicalCheckoutService } from '@/modules/checkout/services/canonicalCheckout.service';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';
import { getEffectiveUserId } from '@/shared/utils/devIdentity';

export interface JobCreditPackOption {
  id: string;
  offerId: string | null;
  name: string;
  description: string | null;
  credits: number;
  priceCents: number;
  currency: string;
  validityDays: number;
}

export interface CompanyCreditCheckoutData {
  companyId: string;
  companyName: string;
  availableCredits: number;
  expiringCredits: number;
  packs: JobCreditPackOption[];
}

const authHeaders = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error && !isDevAuthBypassEnabled) throw error;
  const token = data.session?.access_token ?? env.supabasePublishableKey;
  return {
    apikey: env.supabasePublishableKey,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

const request = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${env.supabaseUrl}/rest/v1/${path}`, { headers: await authHeaders() });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string; error?: string } | null;
    throw new Error(payload?.message ?? payload?.error ?? 'Não foi possível carregar os créditos.');
  }
  return response.json() as Promise<T>;
};

const currentUserId = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error && !isDevAuthBypassEnabled) throw error;
  return getEffectiveUserId(data.user?.id ?? null);
};

export const jobCreditCheckoutService = {
  async getData(): Promise<CompanyCreditCheckoutData> {
    const userId = await currentUserId();
    const memberships = await request<Array<{ company_id: string }>>(
      `company_members?select=company_id&user_id=eq.${encodeURIComponent(userId)}&status=eq.active&order=created_at.asc&limit=1`,
    );
    const companyId = memberships[0]?.company_id;
    if (!companyId) throw new Error('Nenhuma empresa ativa foi encontrada para esta conta.');

    const [companies, balances, packs] = await Promise.all([
      request<Array<{ id: string; legal_name: string; trade_name: string | null }>>(
        `companies?select=id,legal_name,trade_name&id=eq.${encodeURIComponent(companyId)}&limit=1`,
      ),
      request<Array<{ available_credits: number; expiring_credits: number }>>(
        `company_credit_balances?select=available_credits,expiring_credits&company_id=eq.${encodeURIComponent(companyId)}&limit=1`,
      ),
      request<Array<{ id: string; name: string; description: string | null; credit_quantity: number; price_cents: number; currency: string; validity_days: number }>>(
        'job_credit_packs?select=id,name,description,credit_quantity,price_cents,currency,validity_days&active=eq.true&order=sort_order.asc',
      ),
    ]);

    const packIds = packs.map((pack) => pack.id);
    const offers = packIds.length
      ? await request<Array<{ id: string; resource_id: string }>>(
          `commerce_offers?select=id,resource_id&resource_type=eq.job_credit_pack&resource_id=in.(${packIds.join(',')})&status=eq.active`,
        )
      : [];
    const offerByPack = new Map(offers.map((offer) => [offer.resource_id, offer.id]));
    const company = companies[0];

    return {
      companyId,
      companyName: company?.trade_name || company?.legal_name || 'Empresa',
      availableCredits: Number(balances[0]?.available_credits ?? 0),
      expiringCredits: Number(balances[0]?.expiring_credits ?? 0),
      packs: packs.map((pack) => ({
        id: pack.id,
        offerId: offerByPack.get(pack.id) ?? null,
        name: pack.name,
        description: pack.description,
        credits: pack.credit_quantity,
        priceCents: Number(pack.price_cents),
        currency: pack.currency,
        validityDays: pack.validity_days,
      })),
    };
  },

  async checkout(companyId: string, offerId: string): Promise<string> {
    return canonicalCheckoutService.createCheckout(
      [offerId],
      { companyId },
      '/pagamento-sucesso',
      '/empresa/creditos',
    );
  },
};
