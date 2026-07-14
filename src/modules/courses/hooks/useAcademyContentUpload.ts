import { useMutation } from "@tanstack/react-query";
import { academyContentService } from "@/modules/courses/services/academyContent.service";
import type { AcademyUploadKind } from "@/modules/courses/types/academyContent.types";

export const useAcademyContentUpload = () => useMutation({
  mutationFn: ({ file, kind, contentId }: { file: File; kind: AcademyUploadKind; contentId?: string }) =>
    academyContentService.uploadFile(file, kind, contentId),
});
