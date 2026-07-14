import { MOCK_LESSON_COMMENTS } from "@/mocks/lessonComments.mock";
import type { LessonComment } from "@/modules/lessons/types/lessonComment.types";

export const lessonCommentsService = {
  async listComments(_lessonId: string): Promise<LessonComment[]> {
    return MOCK_LESSON_COMMENTS;
  },
};
