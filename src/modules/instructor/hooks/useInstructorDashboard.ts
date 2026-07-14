import { useQuery } from "@tanstack/react-query";
import { instructorService } from "@/modules/instructor/services/instructor.service";

export const useInstructorDashboard = () => useQuery({
  queryKey: ['instructor-dashboard'],
  queryFn: () => instructorService.getDashboard(),
});
