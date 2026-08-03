import { env } from '@/app/config/env';
import { supabase } from '@/integrations/supabase/client';

export interface ManagedServiceCategory {
  id: string;
  name: string;
  slug: string;
}

export interface ManagedServicePackage {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  deliveryDays: number;
  revisions: number;
  deliverables: string[];
  active: boolean;
}

export interface ManagedServiceListing {
  id: string;
  categoryId: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  description: string;
  requirements: string[];
  status: 'draft' | 'published' | 'paused' | 'archived';
  moderationStatus: 'pending' | 'approved' | 'rejected';
  isDemo: boolean;
  packages: ManagedServicePackage[];
}

interface ListingRow {
  id: string;
  category_id: string;
  slug: string;
  title: string;
  short_description: string | null;
  description: string;
  requirements: string[] | null;
  status: ManagedServiceListing['status'];
  moderation_status: ManagedServiceListing['moderationStatus'];
  is_demo: boolean;
  service_packages: Array<{
    id: string;
    name: string;
    description: string | null;
    price_cents: number | string;
    currency: string;
    delivery_days: number;
    revisions: number;
    deliverables: string[] | null;
    active: boolean;
  }> | null;
}

const invokeCatalog = async (body: Record<string, unknown>) => {
  const { data: sessionData } = await supabase.auth.getSession();
  const authorization = sessionData.session?.access_token ?? env.supabasePublishableKey;
  const response = await fetch(`${env.supabaseUrl}/functions/v1/manage-service-catalog`, {
    method: 'POST',
    headers: {
      apikey: env.supabasePublishableKey,
      Authorization: `Bearer ${authorization}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({})) as { id?: string; success?: boolean; error?: string };
  if (!response.ok) throw new Error(payload.error ?? 'Não foi possível atualizar o catálogo de serviços.');
  return payload;
};

export const serviceCatalogManagementService = {
  async listCategories(): Promise<ManagedServiceCategory[]> {
    const { data, error } = await supabase.from('service_categories')
      .select('id,name,slug')
      .eq('active', true)
      .order('sort_order');
    if (error) throw error;
    return (data ?? []) as ManagedServiceCategory[];
  },

  async listProviderListings(providerId: string): Promise<ManagedServiceListing[]> {
    const { data, error } = await supabase.from('service_listings')
      .select('id,category_id,slug,title,short_description,description,requirements,status,moderation_status,is_demo,service_packages(id,name,description,price_cents,currency,delivery_days,revisions,deliverables,active)')
      .eq('provider_id', providerId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return ((data ?? []) as unknown as ListingRow[]).map((row) => ({
      id: row.id,
      categoryId: row.category_id,
      slug: row.slug,
      title: row.title,
      shortDescription: row.short_description,
      description: row.description,
      requirements: row.requirements ?? [],
      status: row.status,
      moderationStatus: row.moderation_status,
      isDemo: row.is_demo,
      packages: (row.service_packages ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        priceCents: Number(item.price_cents),
        currency: item.currency,
        deliveryDays: item.delivery_days,
        revisions: item.revisions,
        deliverables: item.deliverables ?? [],
        active: item.active,
      })),
    }));
  },

  async saveListing(input: {
    actingUserId: string;
    listingId?: string;
    categoryId: string;
    title: string;
    shortDescription: string;
    description: string;
    requirements: string[];
  }): Promise<string> {
    const payload = await invokeCatalog({ action: 'save_listing', ...input });
    if (!payload.id) throw new Error('O serviço foi salvo sem identificador.');
    return payload.id;
  },

  async savePackage(input: {
    actingUserId: string;
    listingId: string;
    packageId?: string;
    packageName: string;
    packageDescription: string;
    priceCents: number;
    currency: string;
    deliveryDays: number;
    revisions: number;
    deliverables: string[];
    active: boolean;
  }): Promise<string> {
    const payload = await invokeCatalog({ action: 'save_package', ...input });
    if (!payload.id) throw new Error('O pacote foi salvo sem identificador.');
    return payload.id;
  },

  async submitListing(actingUserId: string, listingId: string): Promise<void> {
    await invokeCatalog({ action: 'submit_listing', actingUserId, listingId });
  },

  async archiveListing(actingUserId: string, listingId: string): Promise<void> {
    await invokeCatalog({ action: 'archive_listing', actingUserId, listingId });
  },
};
