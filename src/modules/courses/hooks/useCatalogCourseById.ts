import { useQuery } from "@tanstack/react-query";
import { academyService } from "@/modules/courses/services/academy.service";

export const useCatalogCourseById = (id: string | undefined) => {
  return useQuery({
    queryKey: ['course-catalog-by-id', 'mock', id],
    queryFn: () => academyService.getCatalogCourseById(id!),
    enabled: !!id,
  });
};
