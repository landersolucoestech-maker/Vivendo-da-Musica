import { useQuery } from '@tanstack/react-query';

import { adminUsersService } from '@/modules/admin/services/adminUsers.service';

export const useAdminUsers = () => useQuery({
  queryKey: ['admin-users'],
  queryFn: () => adminUsersService.listUsers(),
});

export const useAdminStudents = () => useQuery({
  queryKey: ['admin-students'],
  queryFn: () => adminUsersService.listStudents(),
});
