import { useQuery } from "@tanstack/react-query";
import { checkoutService } from "@/modules/checkout/services/checkout.service";

export const useOrders = () => {
  return useQuery({
    queryKey: ['student-orders'],
    queryFn: () => checkoutService.listOrders(),
  });
};
