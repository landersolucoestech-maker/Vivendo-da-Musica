import { useQuery } from "@tanstack/react-query";
import { academyService } from "@/modules/courses/services/academy.service";

export const useCourseCatalog = () => {
  return useQuery({
    queryKey: ['course-catalog'],
    queryFn: () => academyService.listCatalogCourses(),
  });
};

export const useCourseCategories = () => {
  return useQuery({
    queryKey: ['course-categories'],
    queryFn: () => academyService.listCourseCategories(),
  });
};
