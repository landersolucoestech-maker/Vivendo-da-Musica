import { env } from '@/app/config/env';
import { supabase } from '@/integrations/supabase/client';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';

export interface CanonicalAdminOrder {
  id: string;
  status: string;
  totalCents: number;
  currency: string;
  provider: string | null;
  providerReference: string | null;
  createdAt: string;
  paidAt: string | null;
  refundedCents: number;
  chargebackCents: number;
  adjustableCents: number;
  itemTitles: string[];
}

export interface CanonicalPayout {
  id: string;
  ownerUserId: string;
  beneficiaryType: 'seller' | 'affiliate';
  amountCents: number;
  currency: string;
  status: 'requested' | 'processing' | 'paid' | 'failed' | 'rejected' | 'canceled';
  destinationLabel: string;
  requestedAt: string;
  processedAt: string | null;
}

export interface CanonicalFinanceSummary {
  grossPaidCents: number;
  refundedCents: number;
  chargebackCents: number;
  platformRevenueCents: number;
  payableCents: number;
  cashBalanceCents: number;
}

const headers = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error && !isDevAuthBypassEnabled) throw error;
  const token = data.session?.access_token ?? env.supabasePublishableKey;
  return { apikey: env.supabasePublishableKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${env.supabaseUrl}/rest/v1/${path}`, { ...init, headers: { ...(await headers()), ...(init?.headers ?? {}) } });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string; error?: string; details?: string } | null;
    throw new Error(payload?.message ?? payload?.error ?? payload?.details ?? 'Operação financeira não concluída.');
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
};

export const adminCanonicalFinanceService = {
  async getDashboard(): Promise<{ summary: CanonicalFinanceSummary; orders: CanonicalAdminOrder[]; payouts: CanonicalPayout[] }> {
    const [orders, payments, accountBalances, payoutRows, destinations] = await Promise.all([
      request<Array<Record<string, unknown>>>(
        'commerce_orders?select=id,status,total_cents,currency,provider,provider_reference,created_at,paid_at,commerce_order_items(title_snapshot)&order=created_at.desc&limit=500',
      ),
      request<Array<Record<string, unknown>>>(
        'payments?select=order_id,gross_amount_cents,refunded_amount_cents,chargeback_amount_cents,status&order=created_at.desc&limit=500',
      ),
      request<Array<Record<string, unknown>>>(
        'ledger_account_balances?select=account_code,balance_cents&limit=5000',
      ),
      request<Array<Record<string, unknown>>>(
        'payout_requests?select=id,owner_user_id,destination_id,beneficiary_type,amount_cents,currency,status,requested_at,processed_at&order=requested_at.desc&limit=500',
      ),
      request<Array<Record<string, unknown>>>(
        'payout_destinations?select=id,display_label&limit=500',
      ),
    ]);

    const paymentByOrder = new Map(payments.map((payment) => [String(payment.order_id), payment]));
    const destinationById = new Map(destinations.map((destination) => [String(destination.id), String(destination.display_label)]));
    const mappedOrders: CanonicalAdminOrder[] = orders.map((order) => {
      const payment = paymentByOrder.get(String(order.id));
      const gross = Number(payment?.gross_amount_cents ?? order.total_cents ?? 0);
      const refunded = Number(payment?.refunded_amount_cents ?? 0);
      const chargeback = Number(payment?.chargeback_amount_cents ?? 0);
      const items = Array.isArray(order.commerce_order_items) ? order.commerce_order_items : [];
      return {
        id: String(order.id),
        status: String(order.status),
        totalCents: Number(order.total_cents),
        currency: String(order.currency),
        provider: order.provider ? String(order.provider) : null,
        providerReference: order.provider_reference ? String(order.provider_reference) : null,
        createdAt: String(order.created_at),
        paidAt: order.paid_at ? String(order.paid_at) : null,
        refundedCents: refunded,
        chargebackCents: chargeback,
        adjustableCents: Math.max(0, gross - refunded - chargeback),
        itemTitles: (items as Array<Record<string, unknown>>).map((item) => String(item.title_snapshot)),
      };
    });

    const balance = (code: string) => accountBalances
      .filter((account) => String(account.account_code) === code)
      .reduce((sum, account) => sum + Number(account.balance_cents), 0);
    const grossPaidCents = payments.filter((payment) => ['paid', 'partially_refunded', 'refunded', 'chargeback'].includes(String(payment.status)))
      .reduce((sum, payment) => sum + Number(payment.gross_amount_cents), 0);
    const refundedCents = payments.reduce((sum, payment) => sum + Number(payment.refunded_amount_cents ?? 0), 0);
    const chargebackCents = payments.reduce((sum, payment) => sum + Number(payment.chargeback_amount_cents ?? 0), 0);

    return {
      summary: {
        grossPaidCents,
        refundedCents,
        chargebackCents,
        platformRevenueCents: balance('revenue.platform'),
        payableCents: balance('payable.earnings') + balance('payable.affiliate'),
        cashBalanceCents: balance('cash.received'),
      },
      orders: mappedOrders,
      payouts: payoutRows.map((payout) => ({
        id: String(payout.id),
        ownerUserId: String(payout.owner_user_id),
        beneficiaryType: payout.beneficiary_type as CanonicalPayout['beneficiaryType'],
        amountCents: Number(payout.amount_cents),
        currency: String(payout.currency),
        status: payout.status as CanonicalPayout['status'],
        destinationLabel: destinationById.get(String(payout.destination_id)) ?? 'Destino protegido',
        requestedAt: String(payout.requested_at),
        processedAt: payout.processed_at ? String(payout.processed_at) : null,
      })),
    };
  },

  async recordAdjustment(orderId: string, type: 'refund' | 'chargeback', amountCents: number, reason: string): Promise<void> {
    const rpc = isDevAuthBypassEnabled ? 'admin_record_demo_payment_adjustment' : 'admin_record_payment_adjustment';
    const body = isDevAuthBypassEnabled
      ? {
          target_order_id: orderId,
          target_adjustment_type: type,
          target_amount_cents: amountCents,
          target_idempotency_key: `admin_${type}_${crypto.randomUUID()}`,
          target_reason: reason,
        }
      : {
          target_order_id: orderId,
          target_adjustment_type: type,
          target_amount_cents: amountCents,
          target_provider_reference: null,
          target_idempotency_key: `admin_${type}_${crypto.randomUUID()}`,
          target_reason: reason,
        };
    await request(`rpc/${rpc}`, { method: 'POST', body: JSON.stringify(body) });
  },

  async transitionPayout(id: string, status: Exclude<CanonicalPayout['status'], 'requested'>): Promise<void> {
    const rpc = isDevAuthBypassEnabled ? 'admin_transition_demo_unified_payout' : 'admin_transition_unified_payout';
    await request(`rpc/${rpc}`, {
      method: 'POST',
      body: JSON.stringify({
        target_request_id: id,
        target_status: status,
        target_provider_reference: status === 'paid' ? `admin:${crypto.randomUUID()}` : null,
        target_failure_reason: ['failed', 'rejected', 'canceled'].includes(status) ? 'Atualizado pelo administrador.' : null,
      }),
    });
  },
};
