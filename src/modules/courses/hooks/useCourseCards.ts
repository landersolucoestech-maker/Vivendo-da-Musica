import { useQuery } from "@tanstack/react-query";
import { academyService } from "@/modules/courses/services/academy.service";

export const useCourseCards = () => {
  return useQuery({
    queryKey: ['course-cards'],
    queryFn: () => academyService.listCourseCards(),
  });
};

export const useFeaturedCourseCards = () => {
  return useQuery({
    queryKey: ['featured-course-cards'],
    queryFn: () => academyService.listFeaturedCourseCards(),
  });
};
