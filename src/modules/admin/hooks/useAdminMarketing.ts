import { useQuery } from "@tanstack/react-query";
import { adminService } from "@/modules/admin/services/admin.service";

export const useAdminCampaigns = () => useQuery({ queryKey: ['admin-campaigns'], queryFn: () => adminService.listCampaigns() });
export const useAdminLeads = () => useQuery({ queryKey: ['admin-leads'], queryFn: () => adminService.listLeads() });
export const useAdminLandingPages = () => useQuery({ queryKey: ['admin-landing-pages'], queryFn: () => adminService.listLandingPages() });
