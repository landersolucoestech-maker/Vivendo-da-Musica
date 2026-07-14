import { useQuery } from '@tanstack/react-query';
import { academyService } from '@/modules/courses/services/academy.service';
import type { CourseModule } from '../types/courseModule';

export const useModules = () => {
  return useQuery<CourseModule[]>({
    queryKey: ['course-modules'],
    queryFn: () => academyService.listCourseModules(),
  });
};
