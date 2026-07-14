import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import UserAvatar from "@/shared/components/UserAvatar";
import LoadingState from "@/shared/components/LoadingState";
import { useToast } from "@/shared/hooks/use-toast";
import { useCreateLessonComment, useLessonComments } from "@/modules/lessons/hooks/useLessonComments";

interface LessonCommentsProps {
  lessonId: string;
}

const LessonComments = ({ lessonId }: LessonCommentsProps) => {
  const { toast } = useToast();
  const [draft, setDraft] = useState('');
  const { data: comments, isLoading } = useLessonComments(lessonId);
  const createComment = useCreateLessonComment(lessonId);

  const handlePublish = async () => {
    if (!draft.trim()) return;
    try {
      await createComment.mutateAsync(draft);
      toast({ title: "Comentário publicado!" });
      setDraft('');
    } catch (error) {
      toast({
        title: "Não foi possível publicar o comentário",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold mb-4">Comentários</h2>

      <div className="flex gap-3 mb-5">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Deixe uma dúvida ou comentário sobre a aula..."
          className="resize-none"
        />
      </div>
      <div className="flex justify-end mb-6">
        <Button size="sm" onClick={handlePublish} disabled={createComment.isPending || !draft.trim()}>
          <Send className="w-4 h-4 mr-2" />
          Comentar
        </Button>
      </div>

      {isLoading ? (
        <LoadingState rows={2} className="h-12 rounded-lg" />
      ) : (
        <div className="space-y-4">
          {comments?.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <UserAvatar name={comment.author} size="sm" />
              <div>
                <p className="text-sm">
                  <span className="font-medium">{comment.author}</span>{' '}
                  <span className="text-muted-foreground text-xs">{comment.timeAgo}</span>
                </p>
                <p className="text-sm text-muted-foreground">{comment.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LessonComments;
