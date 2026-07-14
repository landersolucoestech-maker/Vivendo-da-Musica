import { useQuery } from "@tanstack/react-query";
import { instructorService } from "@/modules/instructor/services/instructor.service";

export const useInstructorReports = () => useQuery({
  queryKey: ['instructor-reports'],
  queryFn: () => instructorService.getReports(),
});
