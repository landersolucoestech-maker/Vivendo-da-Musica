import { useQuery } from "@tanstack/react-query";
import { producerService } from "@/modules/producer/services/producer.service";

export const useProducerProducts = () => useQuery({ queryKey: ['producer-products'], queryFn: () => producerService.listProducts() });
export const useProducerOrders = () => useQuery({ queryKey: ['producer-orders'], queryFn: () => producerService.listOrders() });
export const useProducerDashboard = () => useQuery({ queryKey: ['producer-dashboard'], queryFn: () => producerService.getDashboard() });
