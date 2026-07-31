import { BookOpen, CheckCircle2, PlayCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import StudentLayout from '@/app/layouts/StudentLayout';
import { useEnrolledCourses } from '@/modules/dashboard/hooks/useEnrolledCourses';
import type { EnrolledStudentCourse } from '@/modules/dashboard/services/studentCourses.service';
import EmptyState from '@/shared/components/EmptyState';
import ErrorState from '@/shared/components/ErrorState';
import LoadingState from '@/shared/components/LoadingState';
import { Button } from '@/shared/components/ui/button';
import { Progress } from '@/shared/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { ROUTES } from '@/shared/constants/routes';

const MyCoursesPage = () => {
  const navigate = useNavigate();
  const { data: courses = [], isLoading, isError, refetch } = useEnrolledCourses();

  const buckets = {
    'em-andamento': courses.filter((course) => course.progress > 0 && course.progress < 100),
    'nao-iniciados': courses.filter((course) => course.progress === 0),
    concluidos: courses.filter((course) => course.progress === 100),
  };

  const renderList = (list: EnrolledStudentCourse[]) => {
    if (!list.length) {
      return <EmptyState title="Nenhum curso nesta categoria" description="Seus cursos aparecerão aqui conforme o progresso registrado." />;
    }

    return (
      <div className="grid gap-4 xl:grid-cols-2">
        {list.map((course) => {
          const completed = course.progress === 100;
          const notStarted = course.progress === 0;

          return (
            <article key={course.id} className="vdm-surface-interactive overflow-hidden">
              <div className="grid sm:grid-cols-[180px_1fr]">
                <div className="relative min-h-40 overflow-hidden bg-gradient-to-br from-primary via-[#6C3AED] to-[#1A102B]">
                  {course.thumbnailUrl ? (
                    <img src={course.thumbnailUrl} alt={course.title} className="absolute inset-0 size-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <BookOpen className="size-10 text-white/70" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                  <span className="absolute bottom-3 left-3 rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                    {completed ? 'Concluído' : notStarted ? 'Não iniciado' : 'Em andamento'}
                  </span>
                </div>

                <div className="flex min-w-0 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="vdm-eyebrow">Curso matriculado</p>
                      <h2 className="mt-2 line-clamp-2 font-display text-lg font-semibold leading-snug text-white">{course.title}</h2>
                    </div>
                    {completed ? <CheckCircle2 className="size-5 shrink-0 text-emerald-300" /> : <PlayCircle className="size-5 shrink-0 text-primary" />}
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-semibold text-white">{course.progress}%</span>
                    </div>
                    <Progress value={course.progress} aria-label={`Progresso do curso ${course.title}`} className="h-2" />
                  </div>

                  <Button className="mt-6 w-full sm:w-fit" onClick={() => navigate(ROUTES.studentCourse(course.id))}>
                    {notStarted ? 'Começar curso' : completed ? 'Revisar conteúdo' : 'Continuar curso'}
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    );
  };

  return (
    <StudentLayout>
      <header className="mb-8">
        <p className="vdm-eyebrow">Aprendizado</p>
        <h1 className="vdm-page-title mt-2">Meus cursos</h1>
        <p className="vdm-page-description">Acompanhe matrículas, progresso e conteúdos disponíveis em sua jornada.</p>
      </header>

      {isLoading ? (
        <LoadingState rows={4} />
      ) : isError ? (
        <ErrorState title="Não foi possível carregar seus cursos" onRetry={() => void refetch()} />
      ) : (
        <Tabs defaultValue="em-andamento">
          <TabsList className="mb-7 h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl border border-white/8 bg-white/[0.02] p-1.5">
            <TabsTrigger value="em-andamento">Em andamento ({buckets['em-andamento'].length})</TabsTrigger>
            <TabsTrigger value="nao-iniciados">Não iniciados ({buckets['nao-iniciados'].length})</TabsTrigger>
            <TabsTrigger value="concluidos">Concluídos ({buckets.concluidos.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="em-andamento">{renderList(buckets['em-andamento'])}</TabsContent>
          <TabsContent value="nao-iniciados">{renderList(buckets['nao-iniciados'])}</TabsContent>
          <TabsContent value="concluidos">{renderList(buckets.concluidos)}</TabsContent>
        </Tabs>
      )}
    </StudentLayout>
  );
};

export default MyCoursesPage;
