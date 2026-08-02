import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  adminFinanceService,
  type AdminAffiliateWithdrawalStatus,
  type AdminPayoutStatus,
} from '@/modules/admin/services/admin-finance.service';
import { adminService } from '@/modules/admin/services/admin.service';

export const useAdminFinanceSummary = () => useQuery({
  queryKey: ['admin-finance-summary'],
  queryFn: () => adminService.getFinanceSummary(),
});

export const useAdminTransactions = () => useQuery({
  queryKey: ['admin-transactions'],
  queryFn: () => adminService.listTransactions(),
});

export const useAdminInvoices = () => useQuery({
  queryKey: ['admin-invoices'],
  queryFn: () => adminService.listInvoices(),
});

export const useAdminProducerPayouts = () => useQuery({
  queryKey: ['admin-producer-payouts'],
  queryFn: () => adminFinanceService.listProducerPayouts(),
});

export const useAdminAffiliateWithdrawals = () => useQuery({
  queryKey: ['admin-affiliate-withdrawals'],
  queryFn: () => adminFinanceService.listAffiliateWithdrawals(),
});

export const useTransitionProducerPayout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      payoutId: string;
      status: Exclude<AdminPayoutStatus, 'requested'>;
    }) => adminFinanceService.transitionProducerPayout(input.payoutId, input.status),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-producer-payouts'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-finance-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['producer-beat-dashboard'] }),
      ]);
    },
  });
};

export const useTransitionAffiliateWithdrawal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      withdrawalId: string;
      status: Exclude<AdminAffiliateWithdrawalStatus, 'requested'>;
    }) => adminFinanceService.transitionAffiliateWithdrawal(input.withdrawalId, input.status),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-affiliate-withdrawals'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-finance-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['affiliate-portal'] }),
      ]);
    },
  });
};
