import { useQuery } from "@tanstack/react-query";
import { lessonCommentsService } from "@/modules/lessons/services/lessonComments.service";

export const useLessonComments = (lessonId: string) => {
  return useQuery({
    queryKey: ['lesson-comments', 'mock', lessonId],
    queryFn: () => lessonCommentsService.listComments(lessonId),
  });
};
