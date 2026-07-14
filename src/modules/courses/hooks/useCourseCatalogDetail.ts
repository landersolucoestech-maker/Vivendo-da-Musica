import { useQuery } from "@tanstack/react-query";
import { academyService } from "@/modules/courses/services/academy.service";
import type { MockCourse } from "@/modules/courses/types/course.types";

export const useCourseCatalogDetail = (slug: string | undefined) => {
  return useQuery({
    queryKey: ['course-catalog-detail', slug],
    queryFn: () => academyService.getCatalogCourseBySlug(slug!),
    enabled: !!slug,
  });
};

export const useRelatedCourses = (course: MockCourse | undefined) => {
  return useQuery({
    queryKey: ['related-courses', course?.slug],
    queryFn: () => academyService.listRelatedCourses(course!),
    enabled: !!course,
  });
};
