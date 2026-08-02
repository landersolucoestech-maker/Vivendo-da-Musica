import { useQuery } from '@tanstack/react-query';

import { companyService } from '@/modules/company/services/company.service';

export const useCompanyDashboard = () => useQuery({
  queryKey: ['company-dashboard'],
  queryFn: () => companyService.getDashboard(),
});

export const useCompanyOpportunities = () => useQuery({
  queryKey: ['company-opportunities'],
  queryFn: () => companyService.listOpportunities(),
});

export const useCompanyCandidates = () => useQuery({
  queryKey: ['company-candidates'],
  queryFn: () => companyService.listCandidates(),
});

export const useCompanyConversations = () => useQuery({
  queryKey: ['company-conversations'],
  queryFn: () => companyService.listConversations(),
});

export const useCompanyProfile = () => useQuery({
  queryKey: ['company-profile'],
  queryFn: () => companyService.getProfile(),
});
