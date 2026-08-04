import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Circle, ListVideo, PlayCircle } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import LessonComments from '@/modules/lessons/components/LessonComments';
import VideoPlayer from '@/modules/lessons/components/VideoPlayer';
import { useLessons } from '@/modules/lessons/hooks/useLessons';
import { useProgressCalculation } from '@/modules/lessons/hooks/useProgressCalculation';
import { useUpdateProgress, useUserProgress } from '@/modules/lessons/hooks/useUserProgress';
import { useModules } from '@/modules/modules-manager/hooks/useModules';
import Navigation from '@/shared/components/Navigation';
import { Button } from '@/shared/components/ui/button';
import { Progress } from '@/shared/components/ui/progress';
import { ROUTES } from '@/shared/constants/routes';
import { useToast } from '@/shared/hooks/use-toast';

const Lesson = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [watchProgress, setWatchProgress] = useState(0);
  const [markingComplete, setMarkingComplete] = useState(false);
  const { data: lessons, isLoading } = useLessons();
  const { data: userProgress } = useUserProgress();
  const updateProgress = useUpdateProgress();
  const { data: modules } = useModules();
  const modulesWithProgress = useProgressCalculation(modules);

  const currentLesson = lessons?.find((lesson) => lesson.id === lessonId);
  const lessonProgress = userProgress?.find((progress) => progress.lesson_id === lessonId);
  const currentModule = modulesWithProgress.find((module) => module.lessons.some((lesson) => lesson.id === lessonId));

  const flatLessons = useMemo(() => modulesWithProgress.flatMap((module) => module.lessons), [modulesWithProgress]);
  const currentIndex = flatLessons.findIndex((lesson) => lesson.id === lessonId);
  const previousLesson = currentIndex > 0 ? flatLessons[currentIndex - 1] : undefined;
  const nextLesson = currentIndex >= 0 && currentIndex < flatLessons.length - 1 ? flatLessons[currentIndex + 1] : undefined;
  const completedLessons = flatLessons.filter((lesson) => lesson.completed).length;

  useEffect(() => {
    setWatchProgress(lessonProgress?.progress_percentage ?? 0);
  }, [lessonProgress]);

  const handleMarkComplete = async () => {
    if (!currentLesson || markingComplete) return;
    setMarkingComplete(true);
    try {
      await updateProgress.mutateAsync({
        lessonId: currentLesson.id,
        completed: true,
        progressPercentage: 100,
        watchedSeconds: lessonProgress?.watched_seconds ?? 0,
      });
      setWatchProgress(100);
      toast({ title: 'Aula concluída', description: 'Seu progresso foi atualizado.' });
    } catch (error) {
      toast({
        title: 'Não foi possível concluir a aula',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setMarkingComplete(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="vdm-surface flex items-center gap-3 px-6 py-5 text-sm text-muted-foreground">
          <div className="size-6 animate-spin rounded-full border-2 border-white/10 border-t-primary" />
          Carregando aula...
        </div>
      </div>
    );
  }

  if (!currentLesson) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <div className="vdm-surface max-w-md p-8 text-center">
          <ListVideo className="mx-auto size-9 text-primary" />
          <h1 className="mt-5 font-display text-2xl font-bold text-white">Aula não encontrada</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">O conteúdo solicitado pode ter sido removido ou ainda não estar disponível.</p>
          <Button className="mt-6" onClick={() => navigate(ROUTES.dashboard)}>Voltar ao portal</Button>
        </div>
      </div>
    );
  }

  const lessonForPlayer = {
    id: currentLesson.id,
    title: currentLesson.title,
    description: currentLesson.description,
    duration: currentLesson.duration,
    completed: lessonProgress?.completed ?? false,
    video_url: currentLesson.video_url,
    videoUrl: currentLesson.videoUrl,
  };

  return (
    <div className="h-dvh overflow-hidden bg-background text-foreground">
      <Navigation />

      <div className="flex h-full overflow-hidden pt-16 sm:pt-20">
        <aside className="hidden h-full w-80 shrink-0 border-r border-white/8 bg-[#090909] lg:block">
          <div className="h-full overflow-y-auto p-5">
            <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.dashboard)} className="mb-5 -ml-2 text-muted-foreground hover:text-white">
              <ArrowLeft className="size-4" />
              Voltar ao portal
            </Button>

            <div className="mb-6 rounded-xl border border-white/8 bg-white/[0.025] p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progresso do curso</span>
                <span className="font-semibold text-white">{completedLessons}/{flatLessons.length}</span>
              </div>
              <Progress value={flatLessons.length ? (completedLessons / flatLessons.length) * 100 : 0} className="mt-3 h-2" />
            </div>

            {modulesWithProgress.map((module, moduleIndex) => (
              <section key={module.id} className="mb-6">
                <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Módulo {moduleIndex + 1}
                </p>
                <p className="mb-3 px-2 text-sm font-semibold text-white">{module.title}</p>
                <div className="space-y-1">
                  {module.lessons.map((lesson, lessonIndex) => {
                    const isCurrent = lesson.id === lessonId;
                    return (
                      <Link
                        key={lesson.id}
                        to={ROUTES.lesson(lesson.id)}
                        aria-current={isCurrent ? 'page' : undefined}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                          isCurrent
                            ? 'bg-primary/12 text-white ring-1 ring-primary/25'
                            : 'text-muted-foreground hover:bg-white/[0.04] hover:text-white'
                        }`}
                      >
                        {isCurrent ? (
                          <PlayCircle className="size-4 shrink-0 text-primary" />
                        ) : lesson.completed ? (
                          <CheckCircle2 className="size-4 shrink-0 text-emerald-300" />
                        ) : (
                          <Circle className="size-4 shrink-0" />
                        )}
                        <span className="min-w-0 truncate">{lessonIndex + 1}. {lesson.title}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </aside>

        <main
          data-testid="lesson-content-scroll"
          className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]"
        >
          <div className="min-h-full px-4 py-8 sm:px-6 lg:px-10">
            <div className="mx-auto max-w-5xl">
              <header className="mb-7">
                <p className="vdm-eyebrow">{currentModule?.title ?? 'Aula'}</p>
                <h1 className="mt-2 font-display text-3xl font-bold tracking-[-0.03em] text-white">{currentLesson.title}</h1>
                {currentLesson.description && <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{currentLesson.description}</p>}
              </header>

              <div className="mb-6 rounded-xl border border-white/8 bg-card p-4 lg:hidden">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Aulas do curso</p>
                    <p className="mt-1 text-sm text-muted-foreground">{completedLessons} de {flatLessons.length} aulas concluídas</p>
                  </div>
                  <span className="text-sm font-semibold text-primary">{currentIndex + 1}/{flatLessons.length}</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Navegação de aulas">
                  {flatLessons.map((lesson, index) => {
                    const isCurrent = lesson.id === lessonId;
                    return (
                      <Link
                        key={lesson.id}
                        to={ROUTES.lesson(lesson.id)}
                        aria-current={isCurrent ? 'page' : undefined}
                        className={`flex size-10 shrink-0 items-center justify-center rounded-lg border text-sm font-semibold ${
                          isCurrent
                            ? 'border-primary bg-primary/12 text-primary'
                            : lesson.completed
                              ? 'border-emerald-400/30 text-emerald-300'
                              : 'border-white/10 text-muted-foreground'
                        }`}
                      >
                        {index + 1}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-white/10 bg-black shadow-[0_24px_70px_rgba(0,0,0,0.38)]">
                <VideoPlayer lesson={lessonForPlayer} />
              </div>

              <section className="mt-6 vdm-surface p-5">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progresso assistido</span>
                  <span className="font-semibold text-white">{watchProgress}%</span>
                </div>
                <Progress value={watchProgress} aria-label="Progresso assistido da aula" className="h-2" />

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button variant="outline" disabled={!previousLesson} onClick={() => previousLesson && navigate(ROUTES.lesson(previousLesson.id))}>
                    <ChevronLeft className="size-4" />
                    Aula anterior
                  </Button>

                  {watchProgress < 100 ? (
                    <Button onClick={() => void handleMarkComplete()} disabled={markingComplete}>
                      <CheckCircle2 className="size-4" />
                      {markingComplete ? 'Salvando...' : 'Marcar como concluída'}
                    </Button>
                  ) : (
                    <span className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300">
                      <CheckCircle2 className="size-4" />
                      Aula concluída
                    </span>
                  )}

                  <Button variant="outline" disabled={!nextLesson} onClick={() => nextLesson && navigate(ROUTES.lesson(nextLesson.id))}>
                    Próxima aula
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </section>

              <div className="mt-8">
                <LessonComments lessonId={currentLesson.id} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Lesson;
