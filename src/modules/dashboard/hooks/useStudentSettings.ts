import { useQuery } from "@tanstack/react-query";
import { studentService } from "@/modules/dashboard/services/student.service";

export const useStudentSettings = () => {
  return useQuery({
    queryKey: ['student-settings'],
    queryFn: () => studentService.getStudentSettings(),
  });
};
