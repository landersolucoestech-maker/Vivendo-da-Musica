import { useQuery } from '@tanstack/react-query';

import { productService } from '@/modules/marketplace/services/product.service';

export const useProducts = () => useQuery({
  queryKey: ['products'],
  queryFn: () => productService.listProducts(),
});

export const useManagedProducts = () => useQuery({
  queryKey: ['managed-products'],
  queryFn: () => productService.listManagedProducts(),
});

export const useProductCategories = () => useQuery({
  queryKey: ['product-categories'],
  queryFn: () => productService.listCategories(),
});
