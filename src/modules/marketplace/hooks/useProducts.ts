import { useQuery } from "@tanstack/react-query";
import { marketplaceService } from "@/modules/marketplace/services/marketplace.service";

export const useProducts = () => {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => marketplaceService.listProducts(),
  });
};

export const useProductCategories = () => {
  return useQuery({
    queryKey: ['product-categories'],
    queryFn: () => marketplaceService.listCategories(),
  });
};
