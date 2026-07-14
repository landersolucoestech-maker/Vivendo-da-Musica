import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import InstructorLayout from "@/app/layouts/InstructorLayout";
import { useInstructorAudience } from "@/modules/instructor/hooks/useInstructorAudience";
import { instructorService } from "@/modules/instructor/services/instructor.service";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Textarea } from "@/shared/components/ui/textarea";
import { useToast } from "@/shared/hooks/use-toast";

const InstructorAudiencePage = () => {
  const { data, isLoading, isError } = useInstructorAudience();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const moderate = async (id: string, status: 'published' | 'hidden', currentResponse: string | null) => {
    setSaving(id);
    try {
      await instructorService.moderateReview(id, status, responses[id] ?? currentResponse ?? '');
      await queryClient.invalidateQueries({ queryKey: ['instructor-audience'] });
      toast({ title: 'Avaliação atualizada' });
    } catch (error) {
      toast({ title: 'Não foi possível atualizar', description: error instanceof Error ? error.message : 'Tente novamente.', variant: 'destructive' });
    } finally { setSaving(null); }
  };

  return (
    <InstructorLayout>
      <h1 className="text-2xl font-bold">Alunos e avaliações</h1>
      <p className="mb-6 text-sm text-muted-foreground">Acompanhe matrículas e responda avaliações dos seus cursos.</p>
      {isLoading && <p>Carregando...</p>}
      {isError && <p className="text-destructive">Não foi possível carregar os dados.</p>}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Alunos ({data?.students.length ?? 0})</h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left"><tr><th className="p-3">Aluno</th><th className="p-3">Curso</th><th className="p-3">Origem</th><th className="p-3">Situação</th><th className="p-3">Matrícula</th></tr></thead>
            <tbody>{data?.students.map((student) => <tr key={student.enrollmentId} className="border-t"><td className="p-3 font-medium">{student.fullName}</td><td className="p-3">{student.courseTitle}</td><td className="p-3">{student.source === 'stripe' ? 'Pagamento' : 'Manual'}</td><td className="p-3"><Badge variant={student.status === 'active' ? 'default' : 'secondary'}>{student.status === 'active' ? 'Ativa' : 'Revogada'}</Badge></td><td className="p-3">{new Date(student.enrolledAt).toLocaleDateString('pt-BR')}</td></tr>)}</tbody>
          </table>
        </div>
        {!isLoading && !data?.students.length && <p className="text-sm text-muted-foreground">Nenhum aluno matriculado ainda.</p>}
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-xl font-semibold">Avaliações ({data?.reviews.length ?? 0})</h2>
        {data?.reviews.map((review) => (
          <Card key={review.id}>
            <CardHeader><CardTitle className="flex flex-wrap items-center gap-2 text-base"><span>{review.studentName} · {review.courseTitle}</span><Badge variant="outline">{review.rating}/5</Badge><Badge variant={review.status === 'published' ? 'default' : 'secondary'}>{review.status === 'published' ? 'Publicada' : 'Oculta'}</Badge></CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">{review.comment}</p>
              <Textarea aria-label={`Resposta para ${review.studentName}`} placeholder="Resposta pública do instrutor" value={responses[review.id] ?? review.instructorResponse ?? ''} onChange={(event) => setResponses((current) => ({ ...current, [review.id]: event.target.value }))} />
              <div className="flex flex-wrap gap-2"><Button disabled={saving === review.id} onClick={() => moderate(review.id, 'published', review.instructorResponse)}>Salvar e publicar</Button><Button variant="outline" disabled={saving === review.id} onClick={() => moderate(review.id, 'hidden', review.instructorResponse)}>Ocultar avaliação</Button></div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && !data?.reviews.length && <p className="text-sm text-muted-foreground">Nenhuma avaliação recebida ainda.</p>}
      </section>
    </InstructorLayout>
  );
};

export default InstructorAudiencePage;
