import { useQuery } from '@tanstack/react-query';

import { productService } from '@/modules/marketplace/services/product.service';

export const useProductDetail = (slug: string | undefined) => useQuery({
  queryKey: ['product-detail', slug],
  queryFn: () => productService.getProductDetailBundle(slug!),
  enabled: !!slug,
});
