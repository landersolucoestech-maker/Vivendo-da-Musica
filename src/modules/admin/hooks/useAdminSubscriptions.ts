import { useQuery } from "@tanstack/react-query";
import { adminService } from "@/modules/admin/services/admin.service";

export const useAdminSubscriptionSummary = () => useQuery({ queryKey: ['admin-subscription-summary', 'mock'], queryFn: () => adminService.getSubscriptionSummary() });
export const useAdminSubscriptionPlans = () => useQuery({ queryKey: ['admin-subscription-plans', 'mock'], queryFn: () => adminService.listSubscriptionPlans() });
export const useAdminSubscriptions = () => useQuery({ queryKey: ['admin-subscriptions', 'mock'], queryFn: () => adminService.listSubscriptions() });
