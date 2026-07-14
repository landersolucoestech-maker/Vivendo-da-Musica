import { useQuery } from "@tanstack/react-query";
import { adminService } from "@/modules/admin/services/admin.service";

export const useAdminAuditLogs = () => useQuery({ queryKey: ['admin-audit-logs'], queryFn: () => adminService.listAuditLogs() });
export const useAdminAccessSessions = () => useQuery({ queryKey: ['admin-access-sessions'], queryFn: () => adminService.listAccessSessions() });
export const useAdminRoles = () => useQuery({ queryKey: ['admin-roles'], queryFn: () => adminService.listRoles() });
