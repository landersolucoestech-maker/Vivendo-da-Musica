import { useQuery } from "@tanstack/react-query";
import { marketplaceService } from "@/modules/marketplace/services/marketplace.service";

export const useDownloads = () => {
  return useQuery({
    queryKey: ['downloads', 'beats'],
    queryFn: () => marketplaceService.listDownloads(),
  });
};

export const useRecommendedDownloads = (limit = 2) => {
  return useQuery({
    queryKey: ['downloads-recommended', 'beats', limit],
    queryFn: () => marketplaceService.listRecommendedDownloads(limit),
  });
};
