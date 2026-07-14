import { useQuery } from "@tanstack/react-query";
import { marketplaceService } from "@/modules/marketplace/services/marketplace.service";

export const useProductDetail = (slug: string | undefined) => {
  return useQuery({
    queryKey: ['product-detail', 'mock', slug],
    queryFn: () => marketplaceService.getProductDetailBundle(slug!),
    enabled: !!slug,
  });
};
