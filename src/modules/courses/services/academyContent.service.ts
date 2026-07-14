import { supabase } from "@/integrations/supabase/client";
import type {
  AcademyContent,
  AcademyContentAttachment,
  AcademyContentInput,
  AcademyUploadKind,
  AcademyUploadResult,
} from "@/modules/courses/types/academyContent.types";
import {
  ACADEMY_STORAGE_BUCKETS,
  validateAcademyUpload,
} from "@/modules/courses/utils/academyContentUpload";

type AcademyContentRow = {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  description: string | null;
  body: string | null;
  category: string | null;
  tags: string[];
  thumbnail_url: string | null;
  banner_url: string | null;
  video_url: string | null;
  video_file_name: string | null;
  video_mime_type: string | null;
  video_size: number | null;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
  published_at: string | null;
  academy_content_attachments?: AcademyAttachmentRow[];
};

type AcademyAttachmentRow = {
  id: string;
  content_id: string;
  name: string;
  file_url: string;
  mime_type: string;
  size: number;
  created_at: string;
};

const mapAttachment = (attachment: AcademyAttachmentRow): AcademyContentAttachment => ({
  id: attachment.id,
  contentId: attachment.content_id,
  name: attachment.name,
  fileUrl: attachment.file_url,
  mimeType: attachment.mime_type,
  size: attachment.size,
  createdAt: attachment.created_at,
});

const mapContent = (content: AcademyContentRow): AcademyContent => ({
  id: content.id,
  title: content.title,
  slug: content.slug,
  subtitle: content.subtitle,
  description: content.description,
  body: content.body,
  category: content.category,
  tags: content.tags,
  thumbnailUrl: content.thumbnail_url,
  bannerUrl: content.banner_url,
  videoUrl: content.video_url,
  videoFileName: content.video_file_name,
  videoMimeType: content.video_mime_type,
  videoSize: content.video_size,
  status: content.status,
  createdAt: content.created_at,
  updatedAt: content.updated_at,
  publishedAt: content.published_at,
  attachments: (content.academy_content_attachments ?? []).map(mapAttachment),
});

const toRowPayload = (input: AcademyContentInput) => ({
  title: input.title,
  slug: input.slug,
  subtitle: input.subtitle || null,
  description: input.description || null,
  body: input.body || null,
  category: input.category || null,
  tags: input.tags ?? [],
  thumbnail_url: input.thumbnailUrl || null,
  banner_url: input.bannerUrl || null,
  video_url: input.videoUrl || null,
  video_file_name: input.videoFileName || null,
  video_mime_type: input.videoMimeType || null,
  video_size: input.videoSize ?? null,
  status: input.status,
  published_at: input.status === 'published' ? new Date().toISOString() : null,
});

const contentSelect = `
  id,
  title,
  slug,
  subtitle,
  description,
  body,
  category,
  tags,
  thumbnail_url,
  banner_url,
  video_url,
  video_file_name,
  video_mime_type,
  video_size,
  status,
  created_at,
  updated_at,
  published_at,
  academy_content_attachments (
    id,
    content_id,
    name,
    file_url,
    mime_type,
    size,
    created_at
  )
`;

export const academyContentService = {
  async listPublished(): Promise<AcademyContent[]> {
    const { data, error } = await supabase
      .from('academy_contents')
      .select(contentSelect)
      .eq('status', 'published')
      .order('published_at', { ascending: false, nullsFirst: false });

    if (error) throw error;
    return ((data ?? []) as AcademyContentRow[]).map(mapContent);
  },

  async listAdmin(): Promise<AcademyContent[]> {
    const { data, error } = await supabase
      .from('academy_contents')
      .select(contentSelect)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return ((data ?? []) as AcademyContentRow[]).map(mapContent);
  },

  async getPublishedBySlug(slug: string): Promise<AcademyContent | null> {
    const { data, error } = await supabase
      .from('academy_contents')
      .select(contentSelect)
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle();

    if (error) throw error;
    return data ? mapContent(data as AcademyContentRow) : null;
  },

  async create(input: AcademyContentInput): Promise<AcademyContent> {
    const { data, error } = await supabase
      .from('academy_contents')
      .insert(toRowPayload(input))
      .select(contentSelect)
      .single();

    if (error) throw error;
    return mapContent(data as AcademyContentRow);
  },

  async update(id: string, input: AcademyContentInput): Promise<AcademyContent> {
    const { data, error } = await supabase
      .from('academy_contents')
      .update(toRowPayload(input))
      .eq('id', id)
      .select(contentSelect)
      .single();

    if (error) throw error;
    return mapContent(data as AcademyContentRow);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('academy_contents').delete().eq('id', id);
    if (error) throw error;
  },

  async publish(id: string): Promise<void> {
    const { error } = await supabase
      .from('academy_contents')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async unpublish(id: string): Promise<void> {
    const { error } = await supabase
      .from('academy_contents')
      .update({ status: 'draft', published_at: null })
      .eq('id', id);
    if (error) throw error;
  },

  async uploadFile(file: File, kind: AcademyUploadKind, contentId = 'draft'): Promise<AcademyUploadResult> {
    const validationError = validateAcademyUpload(file, kind);
    if (validationError) throw new Error(validationError);

    const bucket = ACADEMY_STORAGE_BUCKETS[kind];
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const path = `${contentId}/${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    });

    if (error) throw error;

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return {
      url: data.publicUrl,
      path,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
    };
  },

  async addAttachment(contentId: string, upload: AcademyUploadResult): Promise<AcademyContentAttachment> {
    const { data, error } = await supabase
      .from('academy_content_attachments')
      .insert({
        content_id: contentId,
        name: upload.fileName,
        file_url: upload.url,
        mime_type: upload.mimeType,
        size: upload.size,
      })
      .select('id, content_id, name, file_url, mime_type, size, created_at')
      .single();

    if (error) throw error;
    return mapAttachment(data);
  },

  async removeAttachment(id: string): Promise<void> {
    const { error } = await supabase.from('academy_content_attachments').delete().eq('id', id);
    if (error) throw error;
  },
};
