import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { instructorService } from "@/modules/instructor/services/instructor.service";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useToast } from "@/shared/hooks/use-toast";

interface Props { courseId: string }

const CourseCurriculumEditor = ({ courseId }: Props) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [moduleTitle, setModuleTitle] = useState('');
  const [lessonTitles, setLessonTitles] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const queryKey = ['instructor-course-structure', courseId];
  const { data: modules = [], isLoading } = useQuery({ queryKey, queryFn: () => instructorService.listCourseStructure(courseId) });

  const refresh = () => queryClient.invalidateQueries({ queryKey });
  const reportError = (error: unknown) => toast({ title: 'Não foi possível concluir', description: error instanceof Error ? error.message : 'Tente novamente.', variant: 'destructive' });

  const addModule = async (event: FormEvent) => {
    event.preventDefault();
    if (!moduleTitle.trim()) return;
    setBusy('module');
    try {
      await instructorService.createModule(courseId, moduleTitle.trim(), modules.length);
      setModuleTitle('');
      await refresh();
    } catch (error) { reportError(error); } finally { setBusy(null); }
  };

  const addLesson = async (moduleId: string, lessonCount: number) => {
    const title = lessonTitles[moduleId]?.trim();
    if (!title) return;
    setBusy(`lesson-${moduleId}`);
    try {
      await instructorService.createLesson(moduleId, { title, orderIndex: lessonCount });
      setLessonTitles((current) => ({ ...current, [moduleId]: '' }));
      await refresh();
    } catch (error) { reportError(error); } finally { setBusy(null); }
  };

  const upload = async (lessonId: string, file: File | undefined, kind: 'sample' | 'project') => {
    if (!file) return;
    const key = `${kind}-${lessonId}`;
    setBusy(key);
    try {
      await instructorService.uploadLessonFile(courseId, lessonId, file, kind);
      toast({ title: 'Arquivo enviado com segurança' });
    } catch (error) { reportError(error); } finally { setBusy(null); }
  };

  return (
    <section className="mt-10 max-w-4xl space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Módulos e aulas</h2>
        <p className="text-sm text-muted-foreground">Organize o currículo e envie materiais privados para cada aula.</p>
      </div>
      <form onSubmit={addModule} className="flex gap-2">
        <Input aria-label="Título do módulo" placeholder="Novo módulo" value={moduleTitle} onChange={(event) => setModuleTitle(event.target.value)} />
        <Button type="submit" disabled={busy === 'module'}>{busy === 'module' ? 'Criando...' : 'Adicionar módulo'}</Button>
      </form>
      {isLoading && <p className="text-sm text-muted-foreground">Carregando conteúdo...</p>}
      {modules.map((module, moduleIndex) => (
        <Card key={module.id}>
          <CardHeader><CardTitle className="text-lg">{moduleIndex + 1}. {module.title}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {module.lessons.map((lesson, lessonIndex) => (
              <div key={lesson.id} className="rounded-md border p-4">
                <p className="font-medium">{lessonIndex + 1}. {lesson.title}</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div><Label htmlFor={`sample-${lesson.id}`}>Material complementar (.zip)</Label><Input id={`sample-${lesson.id}`} type="file" accept=".zip,application/zip" disabled={busy === `sample-${lesson.id}`} onChange={(event) => upload(lesson.id, event.target.files?.[0], 'sample')} /></div>
                  <div><Label htmlFor={`project-${lesson.id}`}>Arquivo de projeto</Label><Input id={`project-${lesson.id}`} type="file" disabled={busy === `project-${lesson.id}`} onChange={(event) => upload(lesson.id, event.target.files?.[0], 'project')} /></div>
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <Input aria-label={`Nova aula de ${module.title}`} placeholder="Título da nova aula" value={lessonTitles[module.id] ?? ''} onChange={(event) => setLessonTitles((current) => ({ ...current, [module.id]: event.target.value }))} />
              <Button type="button" variant="outline" disabled={busy === `lesson-${module.id}`} onClick={() => addLesson(module.id, module.lessons.length)}>Adicionar aula</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
};

export default CourseCurriculumEditor;
