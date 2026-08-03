export interface Product {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  priceCents: number;
  originalPriceCents?: number;
  currency: string;
  status: 'draft' | 'published' | 'archived';
  publishedAt: string | null;
  coverUrl?: string | null;
  gradientFrom: string;
  gradientTo: string;
}

export interface ProductReview {
  author: string;
  rating: number;
  comment: string;
}

export interface ProductQA {
  question: string;
  answer: string;
  author: string;
}

export type ProductLicense = 'Padrao' | 'Estendida' | 'Exclusiva';

export type BeatLicenseType = 'basic' | 'pro' | 'unlimited' | 'exclusive';

export interface BeatLicense {
  id: string;
  type: BeatLicenseType;
  name: string;
  priceCents: number;
  currency: string;
  deliverables: string[];
  usageRights: string[];
  maxCopies?: number;
  isExclusive: boolean;
  available: boolean;
}

export interface Beat {
  id: string;
  slug: string;
  title: string;
  producerId: string;
  producerName: string;
  genre: string;
  bpm: number;
  key: string;
  mood: string;
  durationSeconds: number;
  coverUrl?: string | null;
  audioPreviewUrl?: string | null;
  gradientFrom: string;
  gradientTo: string;
  views: number;
  plays: number;
  sales: number;
  revenueCents: number;
  conversionRate: number;
  exclusiveAvailable: boolean;
  copyrightStatus: 'pending' | 'registered' | 'failed';
  status: 'draft' | 'published' | 'archived';
  copyrightEvidenceId?: string;
  publishedAt: string;
  licenses: BeatLicense[];
}

export interface BeatTransaction {
  id: string;
  beatTitle: string;
  buyerName: string;
  licenseName: string;
  amountCents: number;
  currency: string;
  status: 'paid' | 'refunded' | 'disputed';
  paidAt: string;
}

export interface ProducerBeatDashboard {
  financial: {
    availableBalanceCents: number;
    eligibleBalanceCents: number;
    nextEligibilityAt: string | null;
    currency: string;
    commissionBps: number;
    payoutMinimumCents: number;
    payoutDelayDays: number;
    payoutMethods: {
      id: string;
      type: 'pix' | 'bank_account';
      label: string;
      isDefault: boolean;
    }[];
    payoutRequests: {
      id: string;
      amountCents: number;
      status: 'requested' | 'processing' | 'paid' | 'failed' | 'canceled';
      requestedAt: string;
    }[];
  };
  totals: {
    totalSales: number;
    totalRevenueCents: number;
    totalViews: number;
    totalPlays: number;
    averageConversionRate: number;
  };
  ranking: Beat[];
  transactions: BeatTransaction[];
  beats: Beat[];
}
