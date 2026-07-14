import { useQuery } from "@tanstack/react-query";
import { studentService } from "@/modules/dashboard/services/student.service";

export const useNotifications = () => {
  return useQuery({
    queryKey: ['student-notifications'],
    queryFn: () => studentService.listNotifications(),
  });
};

export const useUnreadNotificationsCount = () => {
  return useQuery({
    queryKey: ['student-notifications-unread-count'],
    queryFn: () => studentService.countUnreadNotifications(),
  });
};
