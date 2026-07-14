import type { MockDownload } from "@/modules/marketplace/types/download.types";

export const MOCK_DOWNLOADS: MockDownload[] = [
  { id: 'dl-1', title: 'Trap Essentials Sample Pack', category: 'Sample Packs', isPremium: false, isFavorite: true, purchasedAt: '02/05/2026', sizeLabel: '320 MB' },
  { id: 'dl-2', title: 'MIDI Chord Pack', category: 'MIDI Packs', isPremium: false, isFavorite: false, purchasedAt: '14/05/2026', sizeLabel: '4 MB' },
  { id: 'dl-3', title: 'Masterclass: Mixagem Avançada (slides)', category: 'Biblioteca Premium', isPremium: true, isFavorite: false, purchasedAt: '20/05/2026', sizeLabel: '12 MB' },
];
