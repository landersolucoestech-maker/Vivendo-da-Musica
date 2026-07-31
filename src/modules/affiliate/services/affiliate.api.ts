import { env } from '@/app/config/env';
import { supabase } from '@/integrations/supabase/client';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';

export interface AffiliateProfile {
  id: string;
  display_name: string;
  referral_code: string;
  status: string;
  commission_rate: number;
  balance_cents: number;
  lifetime_earnings_cents: number;
}

export interface AffiliateLink {
  id: string;
  label: string;
  destination_url: string;
  slug: string;
  clicks_count: number;
  conversions_count: number;
  active: boolean;
}

export interface AffiliateConversion {
  id: string;
  customer_reference: string | null;
  gross_amount_cents: number;
  commission_amount_cents: number;
  status: string;
  converted_at: string;
}

export interface AffiliateCommission {
  id: string;
  amount_cents: number;
  status: string;
  available_at: string | null;
  created_at: string;
}

export interface AffiliateWithdrawal {
  id: string;
  amount_cents: number;
  status: string;
  payment_method: string;
  requested_at: string;
}

export interface AffiliateMaterial {
  id: string;
  title: string;
  description: string | null;
  material_type: string;
  asset_url: string | null;
}

export interface AffiliatePortalData {
  profile: AffiliateProfile | null;
  links: AffiliateLink[];
  conversions: AffiliateConversion[];
  commissions: AffiliateCommission[];
  withdrawals: AffiliateWithdrawal[];
  materials: AffiliateMaterial[];
}

const getAffiliateProfile = async (): Promise<AffiliateProfile | null> => {
  let query = supabase
    .from('affiliate_profiles')
    .select('id, display_name, referral_code, status, commission_rate, balance_cents, lifetime_earnings_cents');

  if (isDevAuthBypassEnabled) {
    query = query.eq('is_demo', true);
  } else {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('Usuário não autenticado');
    query = query.eq('user_id', user.id);
  }

  const { data, error } = await query.limit(1).maybeSingle();
  if (error) throw error;
  return data as AffiliateProfile | null;
};

export async function getAffiliatePortalData(): Promise<AffiliatePortalData> {
  const profile = await getAffiliateProfile();
  if (!profile) {
    return { profile: null, links: [], conversions: [], commissions: [], withdrawals: [], materials: [] };
  }

  const [linksResult, conversionsResult, commissionsResult, withdrawalsResult, materialsResult] = await Promise.all([
    supabase.from('affiliate_links').select('id, label, destination_url, slug, clicks_count, conversions_count, active').eq('affiliate_id', profile.id).order('created_at', { ascending: false }),
    supabase.from('affiliate_conversions').select('id, customer_reference, gross_amount_cents, commission_amount_cents, status, converted_at').eq('affiliate_id', profile.id).order('converted_at', { ascending: false }),
    supabase.from('affiliate_commissions').select('id, amount_cents, status, available_at, created_at').eq('affiliate_id', profile.id).order('created_at', { ascending: false }),
    supabase.from('affiliate_withdrawals').select('id, amount_cents, status, payment_method, requested_at').eq('affiliate_id', profile.id).order('requested_at', { ascending: false }),
    supabase.from('affiliate_marketing_materials').select('id, title, description, material_type, asset_url').eq('active', true).order('created_at', { ascending: false }),
  ]);

  const firstError = [linksResult.error, conversionsResult.error, commissionsResult.error, withdrawalsResult.error, materialsResult.error].find(Boolean);
  if (firstError) throw firstError;

  return {
    profile,
    links: (linksResult.data ?? []) as AffiliateLink[],
    conversions: (conversionsResult.data ?? []) as AffiliateConversion[],
    commissions: (commissionsResult.data ?? []) as AffiliateCommission[],
    withdrawals: (withdrawalsResult.data ?? []) as AffiliateWithdrawal[],
    materials: (materialsResult.data ?? []) as AffiliateMaterial[],
  };
}

const requestDemoWithdrawal = async (amountCents: number, paymentMethod: 'pix' | 'bank_transfer') => {
  const response = await fetch(`${env.supabaseUrl}/rest/v1/rpc/request_demo_affiliate_withdrawal`, {
    method: 'POST',
    headers: {
      apikey: env.supabasePublishableKey,
      Authorization: `Bearer ${env.supabasePublishableKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requested_amount_cents: amountCents,
      requested_payment_method: paymentMethod,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(payload?.message ?? 'Não foi possível registrar o saque de desenvolvimento.');
  }
};

export async function requestAffiliateWithdrawal(amountCents: number, paymentMethod: 'pix' | 'bank_transfer'): Promise<void> {
  if (!Number.isInteger(amountCents) || amountCents < 1000) throw new Error('O valor mínimo para saque é R$ 10,00.');

  if (isDevAuthBypassEnabled) {
    await requestDemoWithdrawal(amountCents, paymentMethod);
    return;
  }

  const profile = await getAffiliateProfile();
  if (!profile) throw new Error('Perfil de afiliado não encontrado.');
  if (profile.status !== 'active') throw new Error('O perfil de afiliado não está ativo.');
  if (amountCents > profile.balance_cents) throw new Error('O valor solicitado excede o saldo disponível.');

  const { error } = await supabase.from('affiliate_withdrawals').insert({
    affiliate_id: profile.id,
    amount_cents: amountCents,
    status: 'requested',
    payment_method: paymentMethod,
    requested_at: new Date().toISOString(),
  });

  if (error) throw error;
}
