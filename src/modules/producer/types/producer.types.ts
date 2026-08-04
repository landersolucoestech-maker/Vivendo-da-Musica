export type SellerProductType = 'preset' | 'drum_kit' | 'midi' | 'plugin' | 'template' | 'project' | 'ebook' | 'other';

export interface SellerProductFile {
  id: string;
  storagePath: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number;
  createdAt: string;
}

export interface SellerProduct {
  id: string;
  title: string;
  slug: string;
  description: string;
  productType: SellerProductType;
  priceCents: number;
  currency: string;
  status: 'draft' | 'published' | 'archived';
  fileCount: number;
  files: SellerProductFile[];
  createdAt: string;
}

export interface SellerOrderItem {
  id: string;
  productTitle: string;
  amountCents: number;
  currency: string;
  paidAt: string | null;
  createdAt: string;
}

export interface ProducerDashboardData {
  financial: {
    availableBalanceCents: number;
    eligibleBalanceCents: number;
    currency: string;
    commissionBps: number;
    payoutMinimumCents: number;
    payoutDelayDays: number;
  };
  totals: {
    grossRevenueCents: number;
    beatRevenueCents: number;
    productRevenueCents: number;
    totalSales: number;
    beatSales: number;
    productSales: number;
    publishedBeats: number;
    publishedProducts: number;
    averageTicketCents: number;
  };
  topProducts: { title: string; sales: number; revenueCents: number }[];
  recentOrders: SellerOrderItem[];
}
