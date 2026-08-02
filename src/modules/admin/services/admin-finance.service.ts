import { env } from '@/app/config/env';
import { supabase } from '@/integrations/supabase/client';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';

export type AdminPayoutStatus = 'requested' | 'processing' | 'paid' | 'failed' | 'canceled';
export type AdminAffiliateWithdrawalStatus = 'requested' | 'processing' | 'paid' | 'rejected' | 'canceled';

export interface AdminProducerPayout {
  id: string;
  producerId: string;
  producerName: string;
  payoutMethodId: string;
  payoutMethodLabel: string;
  amountCents: number;
  currency: string;
  status: AdminPayoutStatus;
  requestedAt: string;
  processedAt: string | null;
}

export interface AdminAffiliateWithdrawal {
  id: string;
  affiliateId: string;
  affiliateName: string;
  amountCents: number;
  paymentMethod: string;
  status: AdminAffiliateWithdrawalStatus;
  requestedAt: string;
  processedAt: string | null;
}

const parseRpcError = async (response: Response, fallback: string): Promise<Error> => {
  const payload = await response.json().catch(() => null) as {
    message?: string;
    error?: string;
    details?: string;
  } | null;

  return new Error(payload?.message ?? payload?.error ?? payload?.details ?? fallback);
};

const getAuthorizationToken = async (): Promise<string> => {
  if (isDevAuthBypassEnabled) return env.supabasePublishableKey;

  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  if (!data.session?.access_token) throw new Error('Sessão administrativa não encontrada.');
  return data.session.access_token;
};

const callTransitionRpc = async (
  rpcName: string,
  body: Record<string, string>,
  fallback: string,
): Promise<void> => {
  const authorizationToken = await getAuthorizationToken();
  const response = await fetch(`${env.supabaseUrl}/rest/v1/rpc/${rpcName}`, {
    method: 'POST',
    headers: {
      apikey: env.supabasePublishableKey,
      Authorization: `Bearer ${authorizationToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw await parseRpcError(response, fallback);
};

export const adminFinanceService = {
  async listProducerPayouts(): Promise<AdminProducerPayout[]> {
    const { data: requests, error } = await supabase
      .from('producer_payout_requests')
      .select('id,producer_id,payout_method_id,amount_cents,currency,status,requested_at,processed_at')
      .order('requested_at', { ascending: false })
      .limit(500);

    if (error) throw new Error(error.message);

    const producerIds = [...new Set((requests ?? []).map((request) => request.producer_id))];
    const methodIds = [...new Set((requests ?? []).map((request) => request.payout_method_id))];

    const [profilesResult, methodsResult] = await Promise.all([
      producerIds.length
        ? supabase.from('user_profiles').select('user_id,full_name').in('user_id', producerIds)
        : Promise.resolve({ data: [], error: null }),
      methodIds.length
        ? supabase.from('producer_payout_methods').select('id,display_label').in('id', methodIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const relatedError = profilesResult.error ?? methodsResult.error;
    if (relatedError) throw new Error(relatedError.message);

    const producerNames = new Map(
      (profilesResult.data ?? []).map((profile) => [profile.user_id, profile.full_name ?? 'Produtor']),
    );
    const methodLabels = new Map(
      (methodsResult.data ?? []).map((method) => [method.id, method.display_label]),
    );

    return (requests ?? []).map((request) => ({
      id: request.id,
      producerId: request.producer_id,
      producerName: producerNames.get(request.producer_id) ?? 'Produtor',
      payoutMethodId: request.payout_method_id,
      payoutMethodLabel: methodLabels.get(request.payout_method_id) ?? 'Destino protegido',
      amountCents: Number(request.amount_cents),
      currency: request.currency,
      status: request.status as AdminPayoutStatus,
      requestedAt: request.requested_at,
      processedAt: request.processed_at,
    }));
  },

  async listAffiliateWithdrawals(): Promise<AdminAffiliateWithdrawal[]> {
    const { data: withdrawals, error } = await supabase
      .from('affiliate_withdrawals')
      .select('id,affiliate_id,amount_cents,payment_method,status,requested_at,processed_at')
      .order('requested_at', { ascending: false })
      .limit(500);

    if (error) throw new Error(error.message);

    const affiliateIds = [...new Set((withdrawals ?? []).map((withdrawal) => withdrawal.affiliate_id))];
    const profilesResult = affiliateIds.length
      ? await supabase.from('affiliate_profiles').select('id,display_name').in('id', affiliateIds)
      : { data: [], error: null };

    if (profilesResult.error) throw new Error(profilesResult.error.message);
    const affiliateNames = new Map(
      (profilesResult.data ?? []).map((profile) => [profile.id, profile.display_name]),
    );

    return (withdrawals ?? []).map((withdrawal) => ({
      id: withdrawal.id,
      affiliateId: withdrawal.affiliate_id,
      affiliateName: affiliateNames.get(withdrawal.affiliate_id) ?? 'Afiliado',
      amountCents: Number(withdrawal.amount_cents),
      paymentMethod: withdrawal.payment_method,
      status: withdrawal.status as AdminAffiliateWithdrawalStatus,
      requestedAt: withdrawal.requested_at,
      processedAt: withdrawal.processed_at,
    }));
  },

  async transitionProducerPayout(
    payoutId: string,
    status: Exclude<AdminPayoutStatus, 'requested'>,
  ): Promise<void> {
    const rpcName = isDevAuthBypassEnabled
      ? 'transition_demo_producer_payout'
      : 'transition_producer_payout';

    await callTransitionRpc(rpcName, {
      target_request_id: payoutId,
      target_status: status,
    }, 'Não foi possível atualizar o repasse.');
  },

  async transitionAffiliateWithdrawal(
    withdrawalId: string,
    status: Exclude<AdminAffiliateWithdrawalStatus, 'requested'>,
  ): Promise<void> {
    const rpcName = isDevAuthBypassEnabled
      ? 'transition_demo_affiliate_withdrawal'
      : 'transition_affiliate_withdrawal';

    await callTransitionRpc(rpcName, {
      target_withdrawal_id: withdrawalId,
      target_status: status,
    }, 'Não foi possível atualizar o saque do afiliado.');
  },
};
