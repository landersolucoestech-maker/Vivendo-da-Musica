import { useQuery } from "@tanstack/react-query";
import { academyService } from "@/modules/courses/services/academy.service";

export const useCourseExtras = (slug: string | undefined) => {
  return useQuery({
    queryKey: ['course-extras', 'mock', slug],
    queryFn: () => academyService.getCourseExtras(slug!),
    enabled: !!slug,
  });
};
