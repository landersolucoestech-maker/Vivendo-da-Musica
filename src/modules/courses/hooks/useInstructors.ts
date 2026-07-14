import { useQuery } from "@tanstack/react-query";
import { academyService } from "@/modules/courses/services/academy.service";

export const useInstructors = () => {
  return useQuery({
    queryKey: ['instructors', 'mock'],
    queryFn: () => academyService.listInstructors(),
  });
};

export const useInstructor = (id: string | undefined) => {
  return useQuery({
    queryKey: ['instructor', 'mock', id],
    queryFn: () => academyService.getInstructorById(id!),
    enabled: !!id,
  });
};
