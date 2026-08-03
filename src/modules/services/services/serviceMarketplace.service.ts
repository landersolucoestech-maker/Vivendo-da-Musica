import { env } from '@/app/config/env';
import { supabase } from '@/integrations/supabase/client';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';
import { getEffectiveUserId } from '@/shared/utils/devIdentity';
import type {
  ServiceCategory,
  ServiceContract,
  ServiceDelivery,
  ServiceListing,
  ServiceMilestone,
  ServicePackage,
  ServiceProviderProfile,
} from '@/modules/services/types/serviceMarketplace.types';

interface ListingRow {
  id: string;
  provider_id: string;
  category_id: string;
  slug: string;
  title: string;
  short_description: string | null;
  description: string;
  requirements: string[] | null;
  portfolio_urls: string[] | null;
  rating_average: number;
  rating_count: number;
  completed_contracts: number;
}

interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

interface ProviderRow {
  user_id: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  verified: boolean;
}

interface PackageRow {
  id: string;
  listing_id: string;
  code: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  delivery_days: number;
  revisions: number;
  deliverables: string[] | null;
}

interface OfferRow {
  id: string;
  resource_id: string;
}

interface ContractRow {
  id: string;
  buyer_id: string;
  provider_id: string;
  title_snapshot: string;
  scope_snapshot: string;
  deliverables_snapshot: string[] | null;
  revisions_included: number;
  total_cents: number;
  currency: string;
  status: ServiceContract['status'];
  started_at: string;
  due_at: string | null;
  completed_at: string | null;
}

interface MilestoneRow {
  id: string;
  contract_id: string;
  title: string;
  description: string | null;
  amount_cents: number;
  currency: string;
  status: ServiceMilestone['status'];
  due_at: string | null;
  accepted_at: string | null;
}

interface DeliveryRow {
  id: string;
  milestone_id: string;
  notes: string | null;
  file_paths: unknown;
  version: number;
  status: string;
  submitted_at: string;
}

const arrayOfStrings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const authorizationHeaders = async () => {
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
      ...(await authorizationHeaders()),
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string; error?: string; details?: string } | null;
    throw new Error(payload?.message ?? payload?.error ?? payload?.details ?? 'Não foi possível concluir a operação.');
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
};

const currentUserId = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error && !isDevAuthBypassEnabled) throw error;
  return getEffectiveUserId(data.user?.id ?? null);
};

const mapCategory = (row: CategoryRow): ServiceCategory => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  description: row.description,
});

const mapProvider = (row: ProviderRow): ServiceProviderProfile => ({
  userId: row.user_id,
  displayName: row.display_name,
  headline: row.headline,
  bio: row.bio,
  avatarUrl: row.avatar_url,
  location: row.location,
  verified: row.verified,
});

const mapPackage = (row: PackageRow, offerId: string | null): ServicePackage => ({
  id: row.id,
  code: row.code,
  name: row.name,
  description: row.description,
  priceCents: Number(row.price_cents),
  currency: row.currency,
  deliveryDays: row.delivery_days,
  revisions: row.revisions,
  deliverables: row.deliverables ?? [],
  offerId,
});

const loadListingRelations = async (listings: ListingRow[]): Promise<ServiceListing[]> => {
  if (!listings.length) return [];
  const providerIds = [...new Set(listings.map((listing) => listing.provider_id))];
  const categoryIds = [...new Set(listings.map((listing) => listing.category_id))];
  const listingIds = listings.map((listing) => listing.id);

  const [categories, providers, packages] = await Promise.all([
    request<CategoryRow[]>(`service_categories?select=id,slug,name,description&id=in.(${categoryIds.join(',')})`),
    request<ProviderRow[]>(`service_provider_profiles?select=user_id,display_name,headline,bio,avatar_url,location,verified&user_id=in.(${providerIds.join(',')})`),
    request<PackageRow[]>(`service_packages?select=id,listing_id,code,name,description,price_cents,currency,delivery_days,revisions,deliverables&listing_id=in.(${listingIds.join(',')})&active=eq.true&order=sort_order.asc`),
  ]);

  const packageIds = packages.map((item) => item.id);
  const offers = packageIds.length
    ? await request<OfferRow[]>(`commerce_offers?select=id,resource_id&resource_type=eq.service&resource_id=in.(${packageIds.join(',')})&status=eq.active`)
    : [];
  const offerByResource = new Map(offers.map((offer) => [offer.resource_id, offer.id]));
  const categoryById = new Map(categories.map((category) => [category.id, mapCategory(category)]));
  const providerById = new Map(providers.map((provider) => [provider.user_id, mapProvider(provider)]));

  return listings.map((listing) => ({
    id: listing.id,
    providerId: listing.provider_id,
    slug: listing.slug,
    title: listing.title,
    shortDescription: listing.short_description,
    description: listing.description,
    requirements: listing.requirements ?? [],
    portfolioUrls: listing.portfolio_urls ?? [],
    ratingAverage: Number(listing.rating_average),
    ratingCount: listing.rating_count,
    completedContracts: listing.completed_contracts,
    category: categoryById.get(listing.category_id) ?? null,
    provider: providerById.get(listing.provider_id) ?? null,
    packages: packages
      .filter((item) => item.listing_id === listing.id)
      .map((item) => mapPackage(item, offerByResource.get(item.id) ?? null)),
  }));
};

export const serviceMarketplaceService = {
  async listPublic(): Promise<ServiceListing[]> {
    const listings = await request<ListingRow[]>(
      'service_listings?select=id,provider_id,category_id,slug,title,short_description,description,requirements,portfolio_urls,rating_average,rating_count,completed_contracts&status=eq.published&moderation_status=eq.approved&order=published_at.desc',
    );
    return loadListingRelations(listings);
  },

  async getBySlug(slug: string): Promise<ServiceListing | null> {
    const listings = await request<ListingRow[]>(
      `service_listings?select=id,provider_id,category_id,slug,title,short_description,description,requirements,portfolio_urls,rating_average,rating_count,completed_contracts&slug=eq.${encodeURIComponent(slug)}&status=eq.published&moderation_status=eq.approved&limit=1`,
    );
    return (await loadListingRelations(listings))[0] ?? null;
  },

  async listContracts(mode: 'buyer' | 'provider'): Promise<ServiceContract[]> {
    const userId = await currentUserId();
    const filter = mode === 'buyer' ? `buyer_id=eq.${userId}` : `provider_id=eq.${userId}`;
    const contracts = await request<ContractRow[]>(
      `service_contracts?select=id,buyer_id,provider_id,title_snapshot,scope_snapshot,deliverables_snapshot,revisions_included,total_cents,currency,status,started_at,due_at,completed_at&${filter}&order=created_at.desc`,
    );
    if (!contracts.length) return [];
    const contractIds = contracts.map((contract) => contract.id);
    const milestones = await request<MilestoneRow[]>(
      `service_milestones?select=id,contract_id,title,description,amount_cents,currency,status,due_at,accepted_at&contract_id=in.(${contractIds.join(',')})&order=order_index.asc`,
    );
    const milestoneIds = milestones.map((milestone) => milestone.id);
    const deliveries = milestoneIds.length
      ? await request<DeliveryRow[]>(
          `service_deliveries?select=id,milestone_id,notes,file_paths,version,status,submitted_at&milestone_id=in.(${milestoneIds.join(',')})&order=version.desc`,
        )
      : [];

    const mappedDelivery = (row: DeliveryRow): ServiceDelivery => ({
      id: row.id,
      notes: row.notes,
      filePaths: arrayOfStrings(row.file_paths),
      version: row.version,
      status: row.status,
      submittedAt: row.submitted_at,
    });

    return contracts.map((contract) => ({
      id: contract.id,
      buyerId: contract.buyer_id,
      providerId: contract.provider_id,
      title: contract.title_snapshot,
      scope: contract.scope_snapshot,
      deliverables: contract.deliverables_snapshot ?? [],
      revisionsIncluded: contract.revisions_included,
      totalCents: Number(contract.total_cents),
      currency: contract.currency,
      status: contract.status,
      startedAt: contract.started_at,
      dueAt: contract.due_at,
      completedAt: contract.completed_at,
      isBuyer: contract.buyer_id === userId,
      isProvider: contract.provider_id === userId,
      milestones: milestones
        .filter((milestone) => milestone.contract_id === contract.id)
        .map((milestone) => ({
          id: milestone.id,
          title: milestone.title,
          description: milestone.description,
          amountCents: Number(milestone.amount_cents),
          currency: milestone.currency,
          status: milestone.status,
          dueAt: milestone.due_at,
          acceptedAt: milestone.accepted_at,
          deliveries: deliveries.filter((delivery) => delivery.milestone_id === milestone.id).map(mappedDelivery),
        })),
    }));
  },

  async submitDelivery(milestoneId: string, notes: string, filePaths: string[] = []): Promise<void> {
    const userId = await currentUserId();
    const functionName = isDevAuthBypassEnabled ? 'submit_demo_service_delivery' : 'submit_service_delivery';
    const body = isDevAuthBypassEnabled
      ? { target_milestone_id: milestoneId, target_provider_id: userId, target_notes: notes, target_file_paths: filePaths }
      : { target_milestone_id: milestoneId, target_notes: notes, target_file_paths: filePaths };
    await request(`rpc/${functionName}`, { method: 'POST', body: JSON.stringify(body) });
  },

  async acceptMilestone(milestoneId: string): Promise<void> {
    const userId = await currentUserId();
    const functionName = isDevAuthBypassEnabled ? 'accept_demo_service_milestone' : 'accept_service_milestone';
    const body = isDevAuthBypassEnabled
      ? { target_milestone_id: milestoneId, target_buyer_id: userId }
      : { target_milestone_id: milestoneId };
    await request(`rpc/${functionName}`, { method: 'POST', body: JSON.stringify(body) });
  },

  async openDispute(contractId: string, reason: string, description: string): Promise<void> {
    const userId = await currentUserId();
    const functionName = isDevAuthBypassEnabled ? 'open_demo_service_dispute' : 'open_service_dispute';
    const body = isDevAuthBypassEnabled
      ? { target_contract_id: contractId, target_opened_by: userId, target_reason: reason, target_description: description }
      : { target_contract_id: contractId, target_reason: reason, target_description: description };
    await request(`rpc/${functionName}`, { method: 'POST', body: JSON.stringify(body) });
  },
};
