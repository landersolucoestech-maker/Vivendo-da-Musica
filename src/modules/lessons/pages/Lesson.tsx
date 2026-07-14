import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from "@/shared/components/ui/button";
import { Progress } from "@/shared/components/ui/progress";
import { CheckCircle, Circle, PlayCircle, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import Navigation from "@/shared/components/Navigation";
import VideoPlayer from "../components/VideoPlayer";
import LessonComments from "../components/LessonComments";
import { useLessons } from "../hooks/useLessons";
import { useUserProgress } from "../hooks/useUserProgress";
import { useModules } from "@/modules/modules-manager/hooks/useModules";
import { useProgressCalculation } from "@/modules/lessons/hooks/useProgressCalculation";
import { ROUTES } from "@/shared/constants/routes";

const Lesson = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const [watchProgress, setWatchProgress] = useState(0);
  const { data: lessons, isLoading } = useLessons();
  const { data: userProgress } = useUserProgress();
  const { data: modules } = useModules();
  const modulesWithProgress = useProgressCalculation(modules);

  const currentLesson = lessons?.find(lesson => lesson.id === lessonId);
  const lessonProgress = userProgress?.find(p => p.lesson_id === lessonId);

  const currentModule = modulesWithProgress.find((module) =>
    module.lessons.some((lesson) => lesson.id === lessonId)
  );

  const flatLessons = useMemo(
    () => modulesWithProgress.flatMap((module) => module.lessons),
    [modulesWithProgress]
  );
  const currentIndex = flatLessons.findIndex((lesson) => lesson.id === lessonId);
  const previousLesson = currentIndex > 0 ? flatLessons[currentIndex - 1] : undefined;
  const nextLesson = currentIndex >= 0 && currentIndex < flatLessons.length - 1 ? flatLessons[currentIndex + 1] : undefined;

  useEffect(() => {
    if (lessonProgress) {
      setWatchProgress(lessonProgress.progress_percentage || 0);
    }
  }, [lessonProgress]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-medium mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando aula...</p>
        </div>
      </div>
    );
  }

  if (!currentLesson) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Aula não encontrada</h1>
          <Button onClick={() => navigate(ROUTES.dashboard)}>
            Voltar ao dashboard
          </Button>
        </div>
      </div>
    );
  }

  const handleMarkComplete = () => {
    setWatchProgress(100);
    // The actual persistence happens inside VideoPlayer via useUpdateProgress.
  };

  const lessonForPlayer = {
    id: currentLesson.id,
    title: currentLesson.title,
    description: currentLesson.description,
    duration: currentLesson.duration,
    completed: lessonProgress?.completed || false,
    video_url: currentLesson.video_url,
    videoUrl: currentLesson.videoUrl,
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <div className="flex pt-16">
        {/* Module/lesson navigator */}
        <aside className="w-72 shrink-0 border-r border-border hidden lg:block">
          <div className="p-4 sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(ROUTES.dashboard)}
              className="text-muted-foreground hover:text-foreground mb-3 -ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>

            {modulesWithProgress.map((module, moduleIndex) => (
              <div key={module.id} className="mb-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase px-2 mb-1">
                  Módulo {moduleIndex + 1}: {module.title}
                </p>
                <div className="flex flex-col gap-0.5">
                  {module.lessons.map((lesson) => {
                    const isCurrent = lesson.id === lessonId;
                    return (
                      <Link
                        key={lesson.id}
                        to={ROUTES.lesson(lesson.id)}
                        className={`flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors ${
                          isCurrent
                            ? 'bg-brand-medium/10 text-brand-medium font-medium'
                            : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                        }`}
                      >
                        {isCurrent ? (
                          <PlayCircle className="w-4 h-4 shrink-0" />
                        ) : lesson.completed ? (
                          <CheckCircle className="w-4 h-4 shrink-0 text-brand-medium" />
                        ) : (
                          <Circle className="w-4 h-4 shrink-0" />
                        )}
                        <span className="truncate">{lesson.title}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 px-4 md:px-8 py-8">
          <div className="max-w-3xl">
            <p className="text-sm text-muted-foreground mb-1">{currentModule?.title}</p>
            <h1 className="text-2xl font-bold mb-6">{currentLesson.title}</h1>

            <div className="lg:hidden rounded-lg border border-border bg-card p-4 mb-6">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Progresso do curso</p>
                  <p className="text-sm text-muted-foreground">{flatLessons.filter((lesson) => lesson.completed).length} de {flatLessons.length} aulas concluÃ­das</p>
                </div>
                <span className="text-sm font-medium text-brand-medium">{currentIndex + 1}/{flatLessons.length}</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Aulas do curso">
                {flatLessons.map((lesson, index) => {
                  const isCurrent = lesson.id === lessonId;
                  return (
                    <Link
                      key={lesson.id}
                      to={ROUTES.lesson(lesson.id)}
                      aria-current={isCurrent ? 'page' : undefined}
                      className={`min-w-10 h-10 rounded-md border flex items-center justify-center text-sm font-medium ${
                        isCurrent
                          ? 'border-brand-medium bg-brand-medium/10 text-brand-medium'
                          : lesson.completed
                            ? 'border-brand-medium/40 text-brand-medium'
                            : 'border-border text-muted-foreground'
                      }`}
                    >
                      {index + 1}
                    </Link>
                  );
                })}
              </div>
            </div>

            <VideoPlayer lesson={lessonForPlayer} />

            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Assistido</span>
                <span>{watchProgress}%</span>
              </div>
              <Progress value={watchProgress} aria-label="Progresso assistido da aula" className="h-2" />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <Button
                variant="outline"
                className="border-border"
                disabled={!previousLesson}
                onClick={() => previousLesson && navigate(ROUTES.lesson(previousLesson.id))}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Aula anterior
              </Button>

              {watchProgress < 100 ? (
                <Button onClick={handleMarkComplete}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Marcar como concluída
                </Button>
              ) : (
                <span className="flex items-center text-brand-medium text-sm font-medium">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Aula concluída
                </span>
              )}

              <Button
                variant="outline"
                className="border-border"
                disabled={!nextLesson}
                onClick={() => nextLesson && navigate(ROUTES.lesson(nextLesson.id))}
              >
                Próxima aula
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            <LessonComments lessonId={currentLesson.id} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Lesson;
