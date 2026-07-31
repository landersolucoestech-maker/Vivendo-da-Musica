import { useQuery } from '@tanstack/react-query';
import { downloadsService } from '@/modules/marketplace/services/downloads.service';

export const useDownloads = () => useQuery({
  queryKey: ['marketplace-downloads'],
  queryFn: () => downloadsService.listDownloads(),
});

export const useRecommendedDownloads = (limit = 2) => useQuery({
  queryKey: ['marketplace-downloads', 'recommended', limit],
  queryFn: () => downloadsService.listRecommendedDownloads(limit),
});
