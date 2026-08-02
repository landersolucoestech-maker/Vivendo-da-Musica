import { useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';

import LessonMaterials from '@/modules/lessons/components/LessonMaterials';
import { useCreateLessonComment, useLessonComments } from '@/modules/lessons/hooks/useLessonComments';
import { useLessons } from '@/modules/lessons/hooks/useLessons';
import LoadingState from '@/shared/components/LoadingState';
import UserAvatar from '@/shared/components/UserAvatar';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { useToast } from '@/shared/hooks/use-toast';

interface LessonCommentsProps {
  lessonId: string;
}

const LessonComments = ({ lessonId }: LessonCommentsProps) => {
  const { toast } = useToast();
  const [draft, setDraft] = useState('');
  const { data: comments, isLoading, isError } = useLessonComments(lessonId);
  const { data: lessons } = useLessons();
  const createComment = useCreateLessonComment(lessonId);
  const materials = lessons?.find((lesson) => lesson.id === lessonId)?.materials ?? [];

  const handlePublish = async () => {
    if (!draft.trim()) return;
    try {
      await createComment.mutateAsync(draft);
      toast({ title: 'Comentário publicado', description: 'Sua mensagem foi adicionada à aula.' });
      setDraft('');
    } catch (error) {
      toast({
        title: 'Não foi possível publicar o comentário',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <LessonMaterials materials={materials} />

      <section className="mt-6 vdm-surface p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="vdm-icon-button border-primary/25 bg-primary/10 text-primary">
            <MessageCircle className="size-5" />
          </span>
          <div>
            <p className="vdm-eyebrow">Discussão da aula</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-white">Comentários</h2>
          </div>
        </div>

        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Escreva uma dúvida ou comentário objetivo sobre esta aula."
            rows={4}
            maxLength={2000}
            className="resize-none"
          />
          <div className="mt-3 flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">{draft.length}/2.000 caracteres</span>
            <Button size="sm" onClick={() => void handlePublish()} disabled={createComment.isPending || !draft.trim()}>
              <Send className="size-4" />
              {createComment.isPending ? 'Publicando...' : 'Publicar'}
            </Button>
          </div>
        </div>

        <div className="mt-6">
          {isLoading ? (
            <LoadingState rows={2} className="h-16 rounded-xl" />
          ) : isError ? (
            <div className="rounded-xl border border-destructive/25 bg-destructive/8 p-4 text-sm text-red-300">
              Não foi possível carregar os comentários desta aula.
            </div>
          ) : !comments?.length ? (
            <div className="rounded-xl border border-white/8 bg-white/[0.02] py-10 text-center text-sm text-muted-foreground">
              Nenhum comentário publicado ainda.
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <article key={comment.id} className="flex gap-3 border-b border-white/8 pb-4 last:border-0 last:pb-0">
                  <UserAvatar name={comment.author} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-sm font-semibold text-white">{comment.author}</p>
                      <span className="text-xs text-muted-foreground">{comment.timeAgo}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#d4d4d4]">{comment.text}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default LessonComments;
