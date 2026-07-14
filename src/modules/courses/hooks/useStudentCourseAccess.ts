import { useQuery } from "@tanstack/react-query";
import { studentCourseAccessService } from "@/modules/courses/services/studentCourseAccess.service";

export const useStudentCourseAccess = (courseId: string | undefined) => {
  return useQuery({
    queryKey: ["student-course-access", courseId],
    queryFn: () => studentCourseAccessService.getCourseAccess(courseId!),
    enabled: !!courseId,
  });
};
