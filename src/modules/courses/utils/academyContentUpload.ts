import type { AcademyUploadKind } from "@/modules/courses/types/academyContent.types";

export const ACADEMY_UPLOAD_LIMITS: Record<AcademyUploadKind, number> = {
  video: 500 * 1024 * 1024,
  image: 10 * 1024 * 1024,
  material: 100 * 1024 * 1024,
};

export const ACADEMY_ALLOWED_MIME_TYPES: Record<AcademyUploadKind, readonly string[]> = {
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  image: ['image/jpeg', 'image/png', 'image/webp'],
  material: [
    'application/pdf',
    'application/zip',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
};

export const ACADEMY_STORAGE_BUCKETS: Record<AcademyUploadKind, string> = {
  video: 'academy-videos',
  image: 'academy-images',
  material: 'academy-materials',
};

export function validateAcademyUpload(file: Pick<File, 'type' | 'size'>, kind: AcademyUploadKind): string | null {
  if (!ACADEMY_ALLOWED_MIME_TYPES[kind].includes(file.type)) {
    return 'Tipo de arquivo nao permitido para este campo.';
  }

  if (file.size > ACADEMY_UPLOAD_LIMITS[kind]) {
    return 'Arquivo acima do tamanho maximo permitido.';
  }

  return null;
}

export function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
