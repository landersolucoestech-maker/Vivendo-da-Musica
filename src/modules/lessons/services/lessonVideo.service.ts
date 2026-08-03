import { supabase } from '@/integrations/supabase/client';

const LESSON_VIDEO_BUCKET = 'lesson-videos';
const DEFAULT_PLAYBACK_TTL_SECONDS = 2 * 60 * 60;

const isPrivateStoragePath = (value: string) =>
  value.length > 0 && !/^(https?:)?\/\//i.test(value);

export const lessonVideoService = {
  async createPlaybackUrl(
    storagePath: string,
    expiresInSeconds = DEFAULT_PLAYBACK_TTL_SECONDS,
  ): Promise<string> {
    if (!isPrivateStoragePath(storagePath)) {
      throw new Error('A videoaula não está armazenada no ambiente privado da plataforma.');
    }

    const { data, error } = await supabase.storage
      .from(LESSON_VIDEO_BUCKET)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new Error(error?.message ?? 'Não foi possível autorizar a reprodução da videoaula.');
    }

    return data.signedUrl;
  },
};
