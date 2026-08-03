import { env } from '@/app/config/env';
import { supabase } from '@/integrations/supabase/client';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';
import { getEffectiveUserId } from '@/shared/utils/devIdentity';

export interface EarningsBalance {
  availableCents: number;
  pendingCents: number;
  allocatedCents: number;
  currency: string;
}

export interface PayoutDestination {
  id: string;
  type: 'pix' | 'bank_account';
  label: string;
  verified: boolean;
  isDefault: boolean;
}

export interface UnifiedPayoutRequest {
  id: string;
  amountCents: number;
  currency: string;
  status: 'requested' | 'processing' | 'paid' | 'failed' | 'rejected' | 'canceled';
  requestedAt: string;
  processedAt: string | null;
}

const getCurrentUserId = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error && !isDevAuthBypassEnabled) throw error;
  return getEffectiveUserId(data.user?.id ?? null);
};

const getAuthorizationHeaders = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error && !isDevAuthBypassEnabled) throw error;
  const token = data.session?.access_token ?? env.supabasePublishableKey;
  return {
    apikey: env.supabasePublishableKey,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${env.supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      ...(await getAuthorizationHeaders()),
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string; error?: string } | null;
    throw new Error(payload?.message ?? payload?.error ?? 'Operação financeira não concluída.');
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
};

export const earningsService = {
  async getSellerFinance(): Promise<{
    balance: EarningsBalance;
    destinations: PayoutDestination[];
    payouts: UnifiedPayoutRequest[];
  }> {
    const userId = await getCurrentUserId();
    const [balanceRows, destinations, payouts] = await Promise.all([
      request<Array<{ status: string; available_at: string | null; unallocated_cents: number }>>(
        `beneficiary_balances?select=status,available_at,unallocated_cents&beneficiary_type=eq.seller&beneficiary_id=eq.${encodeURIComponent(userId)}`,
      ),
      request<Array<Record<string, unknown>>>(
        `payout_destinations?select=id,destination_type,display_label,verified,is_default&owner_user_id=eq.${encodeURIComponent(userId)}&status=eq.active&order=is_default.desc,created_at.asc`,
      ),
      request<Array<Record<string, unknown>>>(
        `payout_requests?select=id,amount_cents,currency,status,requested_at,processed_at&owner_user_id=eq.${encodeURIComponent(userId)}&beneficiary_type=eq.seller&order=requested_at.desc`,
      ),
    ]);

    const now = Date.now();
    const availableCents = balanceRows
      .filter((row) => row.status === 'available' && (!row.available_at || Date.parse(row.available_at) <= now))
      .reduce((sum, row) => sum + Number(row.unallocated_cents), 0);
    const pendingCents = balanceRows
      .filter((row) => row.status === 'pending' || (row.available_at ? Date.parse(row.available_at) > now : false))
      .reduce((sum, row) => sum + Number(row.unallocated_cents), 0);
    const allocatedCents = payouts
      .filter((payout) => ['requested', 'processing'].includes(String(payout.status)))
      .reduce((sum, payout) => sum + Number(payout.amount_cents), 0);

    return {
      balance: { availableCents, pendingCents, allocatedCents, currency: 'BRL' },
      destinations: destinations.map((destination) => ({
        id: String(destination.id),
        type: destination.destination_type as PayoutDestination['type'],
        label: String(destination.display_label),
        verified: Boolean(destination.verified),
        isDefault: Boolean(destination.is_default),
      })),
      payouts: payouts.map((payout) => ({
        id: String(payout.id),
        amountCents: Number(payout.amount_cents),
        currency: String(payout.currency),
        status: payout.status as UnifiedPayoutRequest['status'],
        requestedAt: String(payout.requested_at),
        processedAt: payout.processed_at ? String(payout.processed_at) : null,
      })),
    };
  },

  async requestSellerPayout(destinationId: string, amountCents: number, currency = 'BRL'): Promise<void> {
    const userId = await getCurrentUserId();
    const functionName = isDevAuthBypassEnabled ? 'request_demo_unified_payout' : 'request_unified_payout';
    const body = isDevAuthBypassEnabled
      ? {
          target_owner_user_id: userId,
          target_destination_id: destinationId,
          target_beneficiary_type: 'seller',
          target_amount_cents: amountCents,
          target_currency: currency,
        }
      : {
          target_destination_id: destinationId,
          target_beneficiary_type: 'seller',
          target_amount_cents: amountCents,
          target_currency: currency,
        };

    await request(`rpc/${functionName}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};
