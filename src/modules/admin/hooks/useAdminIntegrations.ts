import { useQuery } from "@tanstack/react-query";
import { adminService } from "@/modules/admin/services/admin.service";

export const useAdminIntegrations = () => useQuery({ queryKey: ['admin-integrations'], queryFn: () => adminService.listIntegrations() });
