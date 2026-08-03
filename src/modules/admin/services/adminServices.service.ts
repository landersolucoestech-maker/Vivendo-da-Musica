import { supabase } from '@/integrations/supabase/client';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';

export interface AdminServiceListing {
  id: string;
  providerId: string;
  providerName: string;
  categoryName: string | null;
  title: string;
  status: 'draft' | 'published' | 'paused' | 'archived';
  moderationStatus: 'pending' | 'approved' | 'rejected';
  isDemo: boolean;
  updatedAt: string;
  packages: Array<{
    id: string;
    name: string;
    priceCents: number;
    currency: string;
    active: boolean;
  }>;
}

export interface AdminServiceDispute {
  id: string;
  contractId: string;
  contractTitle: string;
  contractTotalCents: number;
  currency: string;
  reason: string;
  description: string;
  status: 'open' | 'under_review' | 'resolved_buyer' | 'resolved_provider' | 'resolved_split' | 'closed';
  resolution: string | null;
  isDemo: boolean;
  createdAt: string;
}

interface ListingRow {
  id: string;
  provider_id: string;
  title: string;
  status: AdminServiceListing['status'];
  moderation_status: AdminServiceListing['moderationStatus'];
  is_demo: boolean;
  updated_at: string;
  service_categories: { name: string } | null;
  service_packages: Array<{ id: string; name: string; price_cents: number | string; currency: string; active: boolean }> | null;
}

interface DisputeRow {
  id: string;
  contract_id: string;
  reason: string;
  description: string;
  status: AdminServiceDispute['status'];
  resolution: string | null;
  created_at: string;
  service_contracts: {
    title_snapshot: string;
    total_cents: number | string;
    currency: string;
    is_demo: boolean;
  } | null;
}

const providerNames = async (ids: string[]) => {
  if (!ids.length) return new Map<string, string>();
  const { data, error } = await supabase.from('service_provider_profiles')
    .select('user_id,display_name')
    .in('user_id', [...new Set(ids)]);
  if (error) throw error;
  return new Map((data ?? []).map((item) => [item.user_id, item.display_name]));
};

export const adminServicesService = {
  async listListings(): Promise<AdminServiceListing[]> {
    const { data, error } = await supabase.from('service_listings')
      .select('id,provider_id,title,status,moderation_status,is_demo,updated_at,service_categories(name),service_packages(id,name,price_cents,currency,active)')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    const rows = (data ?? []) as unknown as ListingRow[];
    const names = await providerNames(rows.map((row) => row.provider_id));
    return rows.map((row) => ({
      id: row.id,
      providerId: row.provider_id,
      providerName: names.get(row.provider_id) ?? 'Prestador da plataforma',
      categoryName: row.service_categories?.name ?? null,
      title: row.title,
      status: row.status,
      moderationStatus: row.moderation_status,
      isDemo: row.is_demo,
      updatedAt: row.updated_at,
      packages: (row.service_packages ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        priceCents: Number(item.price_cents),
        currency: item.currency,
        active: item.active,
      })),
    }));
  },

  async listDisputes(): Promise<AdminServiceDispute[]> {
    const { data, error } = await supabase.from('service_disputes')
      .select('id,contract_id,reason,description,status,resolution,created_at,service_contracts(title_snapshot,total_cents,currency,is_demo)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return ((data ?? []) as unknown as DisputeRow[]).map((row) => ({
      id: row.id,
      contractId: row.contract_id,
      contractTitle: row.service_contracts?.title_snapshot ?? 'Contrato de serviço',
      contractTotalCents: Number(row.service_contracts?.total_cents ?? 0),
      currency: row.service_contracts?.currency ?? 'BRL',
      reason: row.reason,
      description: row.description,
      status: row.status,
      resolution: row.resolution,
      isDemo: Boolean(row.service_contracts?.is_demo),
      createdAt: row.created_at,
    }));
  },

  async reviewListing(listing: AdminServiceListing, status: 'approved' | 'rejected', reason: string): Promise<void> {
    const rpcName = isDevAuthBypassEnabled && listing.isDemo
      ? 'admin_review_demo_service_listing'
      : 'admin_review_service_listing';
    const { error } = await supabase.rpc(rpcName, {
      target_listing_id: listing.id,
      target_status: status,
      target_reason: reason || null,
    });
    if (error) throw error;
  },

  async resolveDispute(
    dispute: AdminServiceDispute,
    status: 'resolved_buyer' | 'resolved_provider' | 'resolved_split',
    refundCents: number,
    resolution: string,
  ): Promise<void> {
    const rpcName = isDevAuthBypassEnabled && dispute.isDemo
      ? 'admin_resolve_demo_service_dispute'
      : 'admin_resolve_service_dispute';
    const { error } = await supabase.rpc(rpcName, {
      target_dispute_id: dispute.id,
      target_resolution_status: status,
      target_refund_cents: refundCents,
      target_resolution: resolution,
    });
    if (error) throw error;
  },
};
