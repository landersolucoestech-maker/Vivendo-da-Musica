import { useQuery } from "@tanstack/react-query";
import { adminService } from "@/modules/admin/services/admin.service";

export const useAdminCoupons = () => useQuery({ queryKey: ['admin-coupons'], queryFn: () => adminService.listCoupons() });
