export interface BeatDownload {
  kind: 'beat';
  id: string;
  purchaseId: string;
  contractNumber: string;
  title: string;
  category: string;
  licenseName: string;
  purchasedAt: string;
  expiresAt: string | null;
  downloadedAt: string | null;
  downloadCount: number;
  isExpired: boolean;
}

export interface DigitalProductDownload {
  kind: 'digital_product';
  id: string;
  title: string;
  category: string;
  fileName: string;
  purchasedAt: string;
}

export type MarketplaceDownload = BeatDownload | DigitalProductDownload;
