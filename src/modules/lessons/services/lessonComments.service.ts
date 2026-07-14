import { supabase } from "@/integrations/supabase/client";
import type { LessonComment } from "@/modules/lessons/types/lessonComment.types";

const formatTimeAgo = (createdAt: string) => {
  const elapsedSeconds = Math.round((new Date(createdAt).getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
  if (Math.abs(elapsedSeconds) < 60) return formatter.format(elapsedSeconds, 'second');
  const elapsedMinutes = Math.round(elapsedSeconds / 60);
  if (Math.abs(elapsedMinutes) < 60) return formatter.format(elapsedMinutes, 'minute');
  const elapsedHours = Math.round(elapsedMinutes / 60);
  if (Math.abs(elapsedHours) < 24) return formatter.format(elapsedHours, 'hour');
  return formatter.format(Math.round(elapsedHours / 24), 'day');
};

export const lessonCommentsService = {
  async listComments(lessonId: string): Promise<LessonComment[]> {
    const { data: comments, error } = await supabase
      .from('lesson_comments')
      .select('id, author_id, body, created_at')
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const authorIds = [...new Set((comments ?? []).map((comment) => comment.author_id))];
    const { data: profiles, error: profilesError } = authorIds.length
      ? await supabase.from('user_profiles').select('user_id, full_name').in('user_id', authorIds)
      : { data: [], error: null };
    if (profilesError) throw profilesError;
    const names = new Map((profiles ?? []).map((profile) => [profile.user_id, profile.full_name]));

    return (comments ?? []).map((comment) => ({
      id: comment.id,
      author: names.get(comment.author_id) ?? 'Usuário',
      timeAgo: formatTimeAgo(comment.created_at),
      text: comment.body,
    }));
  },

  async createComment(lessonId: string, body: string): Promise<void> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('Usuário não autenticado');
    const { error } = await supabase.from('lesson_comments').insert({
      lesson_id: lessonId,
      author_id: user.id,
      body: body.trim(),
    });
    if (error) throw error;
  },
};
