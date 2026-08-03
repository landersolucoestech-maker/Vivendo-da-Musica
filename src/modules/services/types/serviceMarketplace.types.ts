export interface ServiceCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

export interface ServiceProviderProfile {
  userId: string;
  displayName: string;
  headline: string | null;
  bio: string | null;
  avatarUrl: string | null;
  location: string | null;
  verified: boolean;
}

export interface ServicePackage {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  deliveryDays: number;
  revisions: number;
  deliverables: string[];
  offerId: string | null;
}

export interface ServiceListing {
  id: string;
  providerId: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  description: string;
  requirements: string[];
  portfolioUrls: string[];
  ratingAverage: number;
  ratingCount: number;
  completedContracts: number;
  category: ServiceCategory | null;
  provider: ServiceProviderProfile | null;
  packages: ServicePackage[];
}

export type ServiceContractStatus =
  | 'active'
  | 'delivery_submitted'
  | 'revision_requested'
  | 'completed'
  | 'disputed'
  | 'canceled'
  | 'refunded';

export type ServiceMilestoneStatus =
  | 'pending'
  | 'in_progress'
  | 'submitted'
  | 'revision_requested'
  | 'accepted'
  | 'disputed'
  | 'canceled';

export interface ServiceDelivery {
  id: string;
  notes: string | null;
  filePaths: string[];
  version: number;
  status: string;
  submittedAt: string;
}

export interface ServiceMilestone {
  id: string;
  title: string;
  description: string | null;
  amountCents: number;
  currency: string;
  status: ServiceMilestoneStatus;
  dueAt: string | null;
  acceptedAt: string | null;
  deliveries: ServiceDelivery[];
}

export interface ServiceContract {
  id: string;
  buyerId: string;
  providerId: string;
  title: string;
  scope: string;
  deliverables: string[];
  revisionsIncluded: number;
  totalCents: number;
  currency: string;
  status: ServiceContractStatus;
  startedAt: string;
  dueAt: string | null;
  completedAt: string | null;
  isBuyer: boolean;
  isProvider: boolean;
  milestones: ServiceMilestone[];
}
