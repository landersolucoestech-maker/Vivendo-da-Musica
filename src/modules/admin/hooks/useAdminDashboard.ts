import { useQuery } from "@tanstack/react-query";
import { adminService } from "@/modules/admin/services/admin.service";

export const useAdminDashboardStats = () => useQuery({ queryKey: ['admin-stats'], queryFn: () => adminService.getDashboardStats() });
export const useAdminSalesSeries = () => useQuery({ queryKey: ['admin-sales-series'], queryFn: () => adminService.getSalesSeries() });
export const useAdminStudentsSeries = () => useQuery({ queryKey: ['admin-students-series'], queryFn: () => adminService.getStudentsSeries() });
export const useAdminTopProducts = () => useQuery({ queryKey: ['admin-top-products'], queryFn: () => adminService.getTopProducts() });
export const useAdminRecentSales = () => useQuery({ queryKey: ['admin-recent-sales'], queryFn: () => adminService.getRecentSales() });
export const useAdminAlerts = () => useQuery({ queryKey: ['admin-alerts'], queryFn: () => adminService.getAlerts() });
export const useAdminRecentActivity = () => useQuery({ queryKey: ['admin-recent-activity'], queryFn: () => adminService.getRecentActivity() });
export const useAdminUpcomingEvents = () => useQuery({ queryKey: ['admin-upcoming-events'], queryFn: () => adminService.getUpcomingEvents() });
