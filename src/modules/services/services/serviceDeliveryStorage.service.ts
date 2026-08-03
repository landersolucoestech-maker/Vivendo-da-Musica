import { supabase } from '@/integrations/supabase/client';
import { getEffectiveUserId } from '@/shared/utils/devIdentity';

interface UploadAuthorization {
  path?: unknown;
  token?: unknown;
}

interface DownloadAuthorization {
  signedUrl?: unknown;
}

const getUserId = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error && !import.meta.env.DEV) throw error;
  return getEffectiveUserId(data.user?.id ?? null);
};

export const serviceDeliveryStorageService = {
  validateFile(file: File): string | null {
    if (!file.size) return 'O arquivo está vazio.';
    if (file.size > 1_073_741_824) return 'O arquivo deve ter no máximo 1 GB.';
    const allowed = new Set([
      'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/flac',
      'video/mp4', 'video/webm', 'application/pdf', 'application/zip',
      'application/x-zip-compressed', 'application/octet-stream',
      'image/jpeg', 'image/png', 'image/webp',
    ]);
    if (!allowed.has(file.type || 'application/octet-stream')) return 'Formato de arquivo não permitido.';
    return null;
  },

  async upload(contractId: string, milestoneId: string, file: File): Promise<string> {
    const validationError = this.validateFile(file);
    if (validationError) throw new Error(validationError);
    const actingUserId = await getUserId();
    const { data, error } = await supabase.functions.invoke('service-delivery-file-access', {
      body: {
        action: 'create_upload',
        contractId,
        milestoneId,
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        actingUserId,
      },
    });
    if (error) throw new Error(error.message);
    const authorization = data as UploadAuthorization;
    if (typeof authorization.path !== 'string' || typeof authorization.token !== 'string') {
      throw new Error('A autorização de upload é inválida.');
    }
    const { error: uploadError } = await supabase.storage
      .from('service-deliveries')
      .uploadToSignedUrl(authorization.path, authorization.token, file, {
        contentType: file.type || 'application/octet-stream',
      });
    if (uploadError) throw new Error(uploadError.message);
    return authorization.path;
  },

  async createDownloadUrl(path: string): Promise<string> {
    const actingUserId = await getUserId();
    const { data, error } = await supabase.functions.invoke('service-delivery-file-access', {
      body: { action: 'create_download', path, actingUserId },
    });
    if (error) throw new Error(error.message);
    const authorization = data as DownloadAuthorization;
    if (typeof authorization.signedUrl !== 'string') throw new Error('O arquivo não foi liberado.');
    return authorization.signedUrl;
  },
};
