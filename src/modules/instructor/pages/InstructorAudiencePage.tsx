import { useState } from 'react';
import { MessageSquareText, Star, Users } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import InstructorLayout from '@/app/layouts/InstructorLayout';
import { useInstructorAudience } from '@/modules/instructor/hooks/useInstructorAudience';
import { instructorService } from '@/modules/instructor/services/instructor.service';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Textarea } from '@/shared/components/ui/textarea';
import { useToast } from '@/shared/hooks/use-toast';

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
      toast({ title: 'Avaliação atualizada', description: status === 'published' ? 'A resposta foi publicada.' : 'A avaliação foi ocultada.' });
    } catch (error) {
      toast({ title: 'Não foi possível atualizar', description: error instanceof Error ? error.message : 'Tente novamente.', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  return (
    <InstructorLayout>
      <header className="mb-8">
        <p className="vdm-eyebrow">Relacionamento acadêmico</p>
        <h1 className="vdm-page-title mt-2">Alunos e avaliações</h1>
        <p className="vdm-page-description">Acompanhe matrículas, situação dos acessos e feedbacks recebidos em seus cursos.</p>
      </header>

      {isLoading && (
        <div className="vdm-surface flex min-h-56 items-center justify-center">
          <div className="size-9 animate-spin rounded-full border-2 border-white/10 border-t-primary" />
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-red-300">Não foi possível carregar os dados do público.</div>
      )}

      {data && (
        <>
          <section className="mb-10">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="vdm-icon-button border-primary/25 bg-primary/10 text-primary"><Users className="size-5" /></span>
                <div>
                  <h2 className="font-display text-xl font-semibold text-white">Alunos matriculados</h2>
                  <p className="text-sm text-muted-foreground">{data.students.length} registros encontrados</p>
                </div>
              </div>
            </div>

            {!data.students.length ? (
              <div className="vdm-surface py-12 text-center text-sm text-muted-foreground">Nenhum aluno matriculado ainda.</div>
            ) : (
              <div className="vdm-surface overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="border-b border-white/10 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    <tr>
                      <th className="p-4">Aluno</th>
                      <th className="p-4">Curso</th>
                      <th className="p-4">Origem</th>
                      <th className="p-4">Situação</th>
                      <th className="p-4">Matrícula</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.students.map((student) => (
                      <tr key={student.enrollmentId} className="border-b border-white/8 last:border-0">
                        <td className="p-4 font-semibold text-white">{student.fullName}</td>
                        <td className="p-4 text-[#d4d4d4]">{student.courseTitle}</td>
                        <td className="p-4 text-muted-foreground">{student.source === 'stripe' ? 'Pagamento' : 'Manual'}</td>
                        <td className="p-4"><Badge variant={student.status === 'active' ? 'success' : 'secondary'}>{student.status === 'active' ? 'Ativa' : 'Revogada'}</Badge></td>
                        <td className="p-4 text-muted-foreground">{new Date(student.enrolledAt).toLocaleDateString('pt-BR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <div className="mb-4 flex items-center gap-3">
              <span className="vdm-icon-button border-primary/25 bg-primary/10 text-primary"><MessageSquareText className="size-5" /></span>
              <div>
                <h2 className="font-display text-xl font-semibold text-white">Avaliações recebidas</h2>
                <p className="text-sm text-muted-foreground">{data.reviews.length} avaliações registradas</p>
              </div>
            </div>

            {!data.reviews.length ? (
              <div className="vdm-surface py-12 text-center text-sm text-muted-foreground">Nenhuma avaliação recebida ainda.</div>
            ) : (
              <div className="grid gap-5 xl:grid-cols-2">
                {data.reviews.map((review) => (
                  <Card key={review.id}>
                    <CardHeader>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-lg">{review.studentName}</CardTitle>
                          <p className="mt-1 text-sm text-muted-foreground">{review.courseTitle}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline"><Star className="mr-1 size-3.5 fill-amber-400 text-amber-400" />{review.rating}/5</Badge>
                          <Badge variant={review.status === 'published' ? 'success' : 'secondary'}>{review.status === 'published' ? 'Publicada' : 'Oculta'}</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <blockquote className="rounded-xl border border-white/8 bg-white/[0.02] p-4 text-sm leading-6 text-[#d4d4d4]">“{review.comment}”</blockquote>
                      <div>
                        <label htmlFor={`response-${review.id}`} className="mb-2 block text-sm font-semibold text-white">Resposta pública</label>
                        <Textarea id={`response-${review.id}`} placeholder="Escreva uma resposta objetiva e profissional." rows={5} value={responses[review.id] ?? review.instructorResponse ?? ''} onChange={(event) => setResponses((current) => ({ ...current, [review.id]: event.target.value }))} />
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button disabled={saving === review.id} onClick={() => void moderate(review.id, 'published', review.instructorResponse)}>
                          {saving === review.id ? 'Salvando...' : 'Salvar e publicar'}
                        </Button>
                        <Button variant="outline" disabled={saving === review.id} onClick={() => void moderate(review.id, 'hidden', review.instructorResponse)}>
                          Ocultar avaliação
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </InstructorLayout>
  );
};

export default InstructorAudiencePage;
