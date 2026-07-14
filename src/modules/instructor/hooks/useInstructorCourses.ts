import { useQuery } from "@tanstack/react-query";
import { instructorService } from "@/modules/instructor/services/instructor.service";

export const useInstructorCourses = () => useQuery({ queryKey: ['instructor-courses'], queryFn: () => instructorService.listCourses() });
