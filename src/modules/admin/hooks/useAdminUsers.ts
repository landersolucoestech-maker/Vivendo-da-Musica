import { useQuery } from "@tanstack/react-query";
import { adminService } from "@/modules/admin/services/admin.service";

export const useAdminUsers = () => useQuery({ queryKey: ['admin-users'], queryFn: () => adminService.listUsers() });
export const useAdminStudents = () => useQuery({ queryKey: ['admin-students'], queryFn: () => adminService.listStudents() });
