import { useQuery } from "@tanstack/react-query";
import { instructorService } from "@/modules/instructor/services/instructor.service";

export const useInstructorAudience = () => useQuery({
  queryKey: ['instructor-audience'],
  queryFn: () => instructorService.getAudience(),
});
