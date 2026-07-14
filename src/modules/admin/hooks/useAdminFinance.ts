import { useQuery } from "@tanstack/react-query";
import { adminService } from "@/modules/admin/services/admin.service";

export const useAdminFinanceSummary = () => useQuery({ queryKey: ['admin-finance-summary'], queryFn: () => adminService.getFinanceSummary() });
export const useAdminTransactions = () => useQuery({ queryKey: ['admin-transactions'], queryFn: () => adminService.listTransactions() });
export const useAdminInvoices = () => useQuery({ queryKey: ['admin-invoices'], queryFn: () => adminService.listInvoices() });
