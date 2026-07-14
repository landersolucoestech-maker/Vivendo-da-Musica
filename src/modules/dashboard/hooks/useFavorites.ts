import { useQuery } from "@tanstack/react-query";
import { studentService } from "@/modules/dashboard/services/student.service";

export const useFavorites = (enabled = true) => {
  return useQuery({
    queryKey: ['favorites'],
    queryFn: () => studentService.listFavorites(),
    enabled,
  });
};
