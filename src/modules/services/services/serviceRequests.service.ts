import { env } from '@/app/config/env';
import { supabase } from '@/integrations/supabase/client';

export type ServiceRequestStatus = 'open' | 'proposal_selected' | 'contracted' | 'closed' | 'canceled';
export type ServiceProposalStatus = 'submitted' | 'accepted' | 'rejected' | 'withdrawn' | 'expired';

export interface ServiceRequestProposal {
  id: string;
  providerId: string;
  providerName: string;
  amountCents: number;
  currency: string;
  deliveryDays: number;
  revisions: number;
  scope: string;
  deliverables: string[];
  status: ServiceProposalStatus;
  expiresAt: string | null;
}

export interface ServiceRequestItem {
  id: string;
  clientId: string;
  categoryId: string | null;
  categoryName: string | null;
  title: string;
  brief: string;
  budgetMinCents: number | null;
  budgetMaxCents: number | null;
  currency: string;
  desiredDeliveryDate: string | null;
  status: ServiceRequestStatus;
  isDemo: boolean;
  createdAt: string;
  proposals: ServiceRequestProposal[];
}

interface RequestRow {
  id: string;
  client_id: string;
  category_id: string | null;
  title: string;
  brief: string;
  budget_min_cents: number | string | null;
  budget_max_cents: number | string | null;
  currency: string;
  desired_delivery_date: string | null;
  status: ServiceRequestStatus;
  is_demo: boolean;
  created_at: string;
  service_categories: { name: string } | null;
  service_proposals: Array<{
    id: string;
    provider_id: string;
    amount_cents: number | string;
    currency: string;
    delivery_days: number;
    revisions: number;
    scope: string;
    deliverables: string[] | null;
    status: ServiceProposalStatus;
    expires_at: string | null;
  }> | null;
}

const invokeRequests = async (body: Record<string, unknown>) => {
  const { data: sessionData } = await supabase.auth.getSession();
  const authorization = sessionData.session?.access_token ?? env.supabasePublishableKey;
  const response = await fetch(`${env.supabaseUrl}/functions/v1/manage-service-requests`, {
    method: 'POST',
    headers: {
      apikey: env.supabasePublishableKey,
      Authorization: `Bearer ${authorization}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({})) as { id?: string; offerId?: string; success?: boolean; error?: string };
  if (!response.ok) throw new Error(payload.error ?? 'Não foi possível atualizar a solicitação de serviço.');
  return payload;
};

const loadProviderNames = async (providerIds: string[]) => {
  if (!providerIds.length) return new Map<string, string>();
  const { data, error } = await supabase.from('service_provider_profiles')
    .select('user_id,display_name')
    .in('user_id', [...new Set(providerIds)]);
  if (error) throw error;
  return new Map((data ?? []).map((item) => [item.user_id, item.display_name]));
};

const mapRequests = async (rows: RequestRow[]): Promise<ServiceRequestItem[]> => {
  const providerIds = rows.flatMap((row) => (row.service_proposals ?? []).map((proposal) => proposal.provider_id));
  const providerNames = await loadProviderNames(providerIds);
  return rows.map((row) => ({
    id: row.id,
    clientId: row.client_id,
    categoryId: row.category_id,
    categoryName: row.service_categories?.name ?? null,
    title: row.title,
    brief: row.brief,
    budgetMinCents: row.budget_min_cents === null ? null : Number(row.budget_min_cents),
    budgetMaxCents: row.budget_max_cents === null ? null : Number(row.budget_max_cents),
    currency: row.currency,
    desiredDeliveryDate: row.desired_delivery_date,
    status: row.status,
    isDemo: row.is_demo,
    createdAt: row.created_at,
    proposals: (row.service_proposals ?? []).map((proposal) => ({
      id: proposal.id,
      providerId: proposal.provider_id,
      providerName: providerNames.get(proposal.provider_id) ?? 'Prestador da plataforma',
      amountCents: Number(proposal.amount_cents),
      currency: proposal.currency,
      deliveryDays: proposal.delivery_days,
      revisions: proposal.revisions,
      scope: proposal.scope,
      deliverables: proposal.deliverables ?? [],
      status: proposal.status,
      expiresAt: proposal.expires_at,
    })),
  }));
};

const requestSelect = 'id,client_id,category_id,title,brief,budget_min_cents,budget_max_cents,currency,desired_delivery_date,status,is_demo,created_at,service_categories(name),service_proposals(id,provider_id,amount_cents,currency,delivery_days,revisions,scope,deliverables,status,expires_at)';

export const serviceRequestsService = {
  async listClientRequests(clientId: string): Promise<ServiceRequestItem[]> {
    const { data, error } = await supabase.from('service_requests')
      .select(requestSelect)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return mapRequests((data ?? []) as unknown as RequestRow[]);
  },

  async listOpenRequests(): Promise<ServiceRequestItem[]> {
    const { data, error } = await supabase.from('service_requests')
      .select(requestSelect)
      .eq('status', 'open')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return mapRequests((data ?? []) as unknown as RequestRow[]);
  },

  async createRequest(input: {
    actingUserId: string;
    categoryId: string;
    listingId?: string;
    title: string;
    brief: string;
    budgetMinCents: number;
    budgetMaxCents: number;
    currency: string;
    desiredDeliveryDate?: string;
  }): Promise<string> {
    const payload = await invokeRequests({ action: 'create_request', ...input });
    if (!payload.id) throw new Error('A solicitação foi criada sem identificador.');
    return payload.id;
  },

  async submitProposal(input: {
    actingUserId: string;
    requestId: string;
    amountCents: number;
    deliveryDays: number;
    revisions: number;
    scope: string;
    deliverables: string[];
  }): Promise<string> {
    const payload = await invokeRequests({ action: 'submit_proposal', ...input });
    if (!payload.id) throw new Error('A proposta foi enviada sem identificador.');
    return payload.id;
  },

  async acceptProposal(actingUserId: string, requestId: string, proposalId: string): Promise<string> {
    const payload = await invokeRequests({ action: 'accept_proposal', actingUserId, requestId, proposalId });
    if (!payload.offerId) throw new Error('A proposta foi aceita sem gerar oferta comercial.');
    return payload.offerId;
  },

  async cancelRequest(actingUserId: string, requestId: string): Promise<void> {
    await invokeRequests({ action: 'cancel_request', actingUserId, requestId });
  },

  async withdrawProposal(actingUserId: string, proposalId: string): Promise<void> {
    await invokeRequests({ action: 'withdraw_proposal', actingUserId, proposalId });
  },
};
