import type { AcademyContent } from "@/modules/courses/types/academyContent.types";

export function getAcademyContentCapabilities(content: Pick<AcademyContent, 'videoUrl' | 'body' | 'attachments' | 'status'>) {
  return {
    hasVideo: !!content.videoUrl,
    hasWrittenContent: !!content.body,
    hasMaterials: !!content.attachments?.length,
    isPublished: content.status === 'published',
  };
}

export function getAcademyVideoFallbackLabel(content: Pick<AcademyContent, 'videoUrl'>): string | null {
  return content.videoUrl ? null : 'Este conteudo ainda nao possui video publicado.';
}
