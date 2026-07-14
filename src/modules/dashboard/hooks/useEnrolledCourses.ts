import { useQuery } from "@tanstack/react-query";
import { studentCoursesService } from "@/modules/dashboard/services/studentCourses.service";

export const useEnrolledCourses = () => useQuery({
  queryKey: ["student-enrolled-courses"],
  queryFn: () => studentCoursesService.listEnrolledCourses(),
});
