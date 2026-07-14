export type AcademyContentStatus = 'draft' | 'published';

export interface AcademyContentAttachment {
  id: string;
  contentId: string;
  name: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface AcademyContent {
  id: string;
  title: string;
  slug: string;
  subtitle?: string | null;
  description?: string | null;
  body?: string | null;
  category?: string | null;
  tags?: string[];
  thumbnailUrl?: string | null;
  bannerUrl?: string | null;
  videoUrl?: string | null;
  videoFileName?: string | null;
  videoMimeType?: string | null;
  videoSize?: number | null;
  attachments?: AcademyContentAttachment[];
  status: AcademyContentStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
}

export interface AcademyContentInput {
  title: string;
  slug: string;
  subtitle?: string;
  description?: string;
  body?: string;
  category?: string;
  tags?: string[];
  thumbnailUrl?: string;
  bannerUrl?: string;
  videoUrl?: string;
  videoFileName?: string;
  videoMimeType?: string;
  videoSize?: number;
  status: AcademyContentStatus;
}

export type AcademyUploadKind = 'video' | 'image' | 'material';

export interface AcademyUploadResult {
  url: string;
  path: string;
  fileName: string;
  mimeType: string;
  size: number;
}
