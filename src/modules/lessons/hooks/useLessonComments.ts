import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { lessonCommentsService } from "@/modules/lessons/services/lessonComments.service";

export const useLessonComments = (lessonId: string) => {
  return useQuery({
    queryKey: ['lesson-comments', lessonId],
    queryFn: () => lessonCommentsService.listComments(lessonId),
  });
};

export const useCreateLessonComment = (lessonId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => lessonCommentsService.createComment(lessonId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lesson-comments', lessonId] }),
  });
};
