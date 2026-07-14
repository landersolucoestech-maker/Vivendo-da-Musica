import { useQuery } from '@tanstack/react-query';
import { academyService, type Course } from '@/modules/courses/services/academy.service';

export type { Course };

/**
 * Lists courses visible to the current caller: published courses (public),
 * plus any course the caller is enrolled in or manages as staff (RLS
 * handles all of that — no client-side filtering needed).
 */
export const useCourses = () => {
  return useQuery({
    queryKey: ['courses'],
    queryFn: () => academyService.listRealCourses(),
  });
};
