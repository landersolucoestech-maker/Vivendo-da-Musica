import { useQuery } from '@tanstack/react-query';

import { adminDashboardService } from '@/modules/admin/services/adminDashboard.service';

export const useAdminDashboardSummary = () => useQuery({
  queryKey: ['admin-dashboard-summary'],
  queryFn: () => adminDashboardService.getSummary(),
});

export const useAdminLearningSeries = () => useQuery({
  queryKey: ['admin-learning-series'],
  queryFn: () => adminDashboardService.getLearningSeries(),
});

export const useAdminCourseOverview = () => useQuery({
  queryKey: ['admin-course-overview'],
  queryFn: () => adminDashboardService.getCourses(),
});

export const useAdminRecentActivity = () => useQuery({
  queryKey: ['admin-recent-activity'],
  queryFn: () => adminDashboardService.getRecentActivity(),
});
