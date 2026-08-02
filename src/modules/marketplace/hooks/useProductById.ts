import { useQuery } from '@tanstack/react-query';
import { marketplaceService } from '@/modules/marketplace/services/marketplace.service';

export const useProductById = (id: string | undefined) => {
  return useQuery({
    queryKey: ['product-by-id', id],
    queryFn: () => marketplaceService.getProductById(id!),
    enabled: !!id,
  });
};
