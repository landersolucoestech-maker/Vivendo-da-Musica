import { useQuery } from '@tanstack/react-query';
import { academyService } from '@/modules/courses/services/academy.service';
import type { CourseModule } from '../types/courseModule';

export const useModules = () => {
  return useQuery<CourseModule[]>({
    queryKey: ['course-modules'],
    queryFn: () => academyService.listCourseModules(),
  });
};

export const useCourseModules = (courseId?: string) => {
  return useQuery<CourseModule[]>({
    queryKey: ['course-modules', courseId],
    queryFn: () => academyService.listCourseModules(courseId),
    enabled: Boolean(courseId),
  });
};
