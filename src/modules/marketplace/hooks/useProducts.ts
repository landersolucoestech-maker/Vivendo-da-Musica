import { useQuery } from '@tanstack/react-query';

import { productService } from '@/modules/marketplace/services/product.service';

export const useProducts = () => useQuery({
  queryKey: ['products'],
  queryFn: () => productService.listProducts(),
});

export const useProductCategories = () => useQuery({
  queryKey: ['product-categories'],
  queryFn: () => productService.listCategories(),
});
