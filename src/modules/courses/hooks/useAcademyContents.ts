import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { academyContentService } from "@/modules/courses/services/academyContent.service";
import type { AcademyContentInput, AcademyUploadResult } from "@/modules/courses/types/academyContent.types";

const ADMIN_QUERY_KEY = ['academy-contents', 'admin'] as const;
const PUBLISHED_QUERY_KEY = ['academy-contents', 'published'] as const;

export const usePublishedAcademyContents = () => useQuery({
  queryKey: PUBLISHED_QUERY_KEY,
  queryFn: () => academyContentService.listPublished(),
});

export const useAdminAcademyContents = () => useQuery({
  queryKey: ADMIN_QUERY_KEY,
  queryFn: () => academyContentService.listAdmin(),
});

export const usePublishedAcademyContentBySlug = (slug: string | undefined) => useQuery({
  queryKey: ['academy-content', 'published', slug],
  queryFn: () => academyContentService.getPublishedBySlug(slug!),
  enabled: !!slug,
});

export const useSaveAcademyContent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: AcademyContentInput }) =>
      id ? academyContentService.update(id, input) : academyContentService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PUBLISHED_QUERY_KEY });
    },
  });
};

export const useDeleteAcademyContent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => academyContentService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PUBLISHED_QUERY_KEY });
    },
  });
};

export const usePublishAcademyContent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, publish }: { id: string; publish: boolean }) =>
      publish ? academyContentService.publish(id) : academyContentService.unpublish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PUBLISHED_QUERY_KEY });
    },
  });
};

export const useAddAcademyAttachment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contentId, upload }: { contentId: string; upload: AcademyUploadResult }) =>
      academyContentService.addAttachment(contentId, upload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEY }),
  });
};

export const useRemoveAcademyAttachment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => academyContentService.removeAttachment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEY }),
  });
};
