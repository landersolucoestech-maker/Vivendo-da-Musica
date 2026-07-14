import { useQuery } from "@tanstack/react-query";
import { academyService } from "@/modules/courses/services/academy.service";

export const useTestimonials = () => {
  return useQuery({
    queryKey: ['testimonials', 'mock'],
    queryFn: () => academyService.listTestimonials(),
  });
};
