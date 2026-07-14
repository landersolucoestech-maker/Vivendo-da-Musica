import { useQuery } from "@tanstack/react-query";
import { studentService } from "@/modules/dashboard/services/student.service";

export const useSupportTickets = () => {
  return useQuery({
    queryKey: ['support-tickets'],
    queryFn: () => studentService.listSupportTickets(),
  });
};

export const useSupportFaq = () => {
  return useQuery({
    queryKey: ['support-faq'],
    queryFn: () => studentService.listSupportFaq(),
  });
};
