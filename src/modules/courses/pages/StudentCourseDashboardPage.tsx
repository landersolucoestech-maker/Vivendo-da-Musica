import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Link as LinkIcon,
  Lock,
  PlayCircle,
} from "lucide-react";
import StudentLayout from "@/app/layouts/StudentLayout";
import EmptyState from "@/shared/components/EmptyState";
import LoadingState from "@/shared/components/LoadingState";
import ErrorState from "@/shared/components/ErrorState";
import { Button } from "@/shared/components/ui/button";
import { Progress } from "@/shared/components/ui/progress";
import { Badge } from "@/shared/components/ui/badge";
import { useToast } from "@/shared/hooks/use-toast";
import { ROUTES } from "@/shared/constants/routes";
import { useStudentCourseAccess } from "@/modules/courses/hooks/useStudentCourseAccess";
import { useLessonFiles, downloadLessonFile } from "@/modules/lessons/hooks/useLessonFiles";
import { useUpdateProgress } from "@/modules/lessons/hooks/useUserProgress";

const getEmbedUrl = (url: string) => {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : url;
};

const parseDurationSeconds = (duration: string) => {
  const [minutes = "0", seconds = "0"] = duration.split(":");
  return Number(minutes) * 60 + Number(seconds);
};

const StudentCourseDashboardPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const updateProgress = useUpdateProgress();
  const { data, isLoading, isError, error, refetch } = useStudentCourseAccess(courseId);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  const progressByLesson = useMemo(() => {
    return new Map((data?.progress ?? []).map((item) => [item.lesson_id, item]));
  }, [data?.progress]);

  const modules = useMemo(() => {
    return (data?.modules ?? []).map((module) => {
      const lessons = module.lessons.map((lesson) => ({
        ...lesson,
        completed: progressByLesson.get(lesson.id)?.completed ?? false,
      }));
      const completedCount = lessons.filter((lesson) => lesson.completed).length;

      return {
        ...module,
        lessons,
        progress: lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0,
      };
    });
  }, [data?.modules, progressByLesson]);

  const lessons = useMemo(() => modules.flatMap((module) => module.lessons), [modules]);
  const activeLesson = lessons.find((lesson) => lesson.id === activeLessonId) ?? lessons[0];
  const activeLessonProgress = activeLesson ? progressByLesson.get(activeLesson.id) : undefined;
  const activeIndex = activeLesson ? lessons.findIndex((lesson) => lesson.id === activeLesson.id) : -1;
  const previousLesson = activeIndex > 0 ? lessons[activeIndex - 1] : undefined;
  const nextLesson = activeIndex >= 0 && activeIndex < lessons.length - 1 ? lessons[activeIndex + 1] : undefined;
  const totalLessons = lessons.length;
  const completedLessons = lessons.filter((lesson) => lesson.completed).length;
  const courseProgress = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const { data: lessonFiles, isLoading: filesLoading } = useLessonFiles(activeLesson?.id ?? "");

  const markLesson = async (lessonId: string, progressPercentage = 100) => {
    await updateProgress.mutateAsync({
      lessonId,
      completed: progressPercentage >= 95,
      progressPercentage,
      watchedSeconds: activeLesson ? parseDurationSeconds(activeLesson.duration) : 0,
    });
    await refetch();
  };

  const handleMarkComplete = async () => {
    if (!activeLesson) return;

    try {
      await markLesson(activeLesson.id);
      toast({
        title: "Aula concluida",
        description: "Seu progresso foi salvo.",
      });
    } catch {
      toast({
        title: "Nao foi possivel salvar",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    }
  };

  const handleVideoEnded = async () => {
    if (!activeLesson || activeLessonProgress?.completed) return;
    await markLesson(activeLesson.id);
  };

  const handleDownload = async (kind: "samples" | "project") => {
    if (!activeLesson) return;

    try {
      const fileName = `${kind}-${activeLesson.title.replace(/\s+/g, "-").toLowerCase()}`;
      await downloadLessonFile(activeLesson.id, kind, fileName);
      toast({
        title: "Download iniciado",
        description: "O material complementar esta sendo preparado.",
      });
    } catch {
      toast({
        title: "Material indisponivel",
        description: "Nao foi possivel gerar o link de download agora.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <StudentLayout>
        <LoadingState rows={5} />
      </StudentLayout>
    );
  }

  if (isError) {
    return (
      <StudentLayout>
        <ErrorState
          title="Nao foi possivel carregar o curso"
          description={error instanceof Error ? error.message : "Tente novamente em alguns instantes."}
        />
      </StudentLayout>
    );
  }

  if (!data) {
    return (
      <StudentLayout>
        <div className="max-w-2xl">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <EmptyState
            title="Acesso nao liberado"
            description="Este curso exige uma matricula ativa. Assim que o pagamento for confirmado, o acesso sera liberado automaticamente."
          />
          <div className="mt-4">
            <Link to={ROUTES.myCourses}>
              <Button variant="outline">Voltar para meus cursos</Button>
            </Link>
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (!activeLesson) {
    return (
      <StudentLayout>
        <EmptyState title="Curso sem aulas publicadas" description="O instrutor ainda nao adicionou conteudo a este curso." />
      </StudentLayout>
    );
  }

  const videoUrl = activeLesson.videoUrl ? getEmbedUrl(activeLesson.videoUrl) : "";
  const isNativeVideo = /\.(mp4|webm|ogg)(\?.*)?$/i.test(videoUrl);

  return (
    <StudentLayout>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(ROUTES.myCourses)}
            className="-ml-3 mb-3 text-muted-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Meus cursos
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Matricula ativa</Badge>
            <Badge variant="outline">{completedLessons} de {totalLessons} aulas</Badge>
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-normal md:text-3xl">{data.course.title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{data.course.description}</p>
        </div>
        <div className="w-full max-w-sm">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso do curso</span>
            <span className="font-medium">{courseProgress}%</span>
          </div>
          <Progress value={courseProgress} className="h-2" aria-label="Progresso do curso" />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="min-w-0 space-y-5">
          <section className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="aspect-video bg-black">
              {videoUrl ? (
                isNativeVideo ? (
                  <video
                    key={activeLesson.id}
                    src={videoUrl}
                    className="h-full w-full"
                    controls
                    onEnded={handleVideoEnded}
                  />
                ) : (
                  <iframe
                    key={activeLesson.id}
                    className="h-full w-full"
                    src={videoUrl}
                    title={activeLesson.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-white/70">
                  Video nao disponivel
                </div>
              )}
            </div>
            <div className="p-4 md:p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Aula {activeIndex + 1}</p>
                  <h2 className="text-xl font-semibold">{activeLesson.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{activeLesson.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {activeLesson.duration}
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  onClick={handleMarkComplete}
                  disabled={updateProgress.isPending || activeLessonProgress?.completed}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {activeLessonProgress?.completed ? "Aula concluida" : "Marcar como concluida"}
                </Button>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <Button variant="outline" disabled={!previousLesson} onClick={() => previousLesson && setActiveLessonId(previousLesson.id)}>
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Anterior
                  </Button>
                  <Button variant="outline" disabled={!nextLesson} onClick={() => nextLesson && setActiveLessonId(nextLesson.id)}>
                    Proxima
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-4 md:p-5">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand-medium" />
              <h3 className="font-semibold">Materiais complementares</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                variant="outline"
                className="justify-start"
                disabled={filesLoading || !lessonFiles?.samples_file_path}
                onClick={() => handleDownload("samples")}
              >
                <Download className="mr-2 h-4 w-4" />
                Samples e loops
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                disabled={filesLoading || !lessonFiles?.project_file_path}
                onClick={() => handleDownload("project")}
              >
                <Download className="mr-2 h-4 w-4" />
                Projeto da aula
              </Button>
              <a
                className="inline-flex h-10 items-center justify-start rounded-md border border-border px-4 text-sm text-muted-foreground"
                href={ROUTES.support}
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                Links e suporte
              </a>
            </div>
          </section>
        </main>

        <aside className="space-y-4">
          {modules.map((module, moduleIndex) => (
            <section key={module.id} className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Modulo {moduleIndex + 1}</p>
                <h3 className="font-semibold">{module.title}</h3>
                <div className="mt-2 flex items-center gap-2">
                  <Progress value={module.progress} className="h-1.5" aria-label={`Progresso do modulo ${module.title}`} />
                  <span className="text-xs text-muted-foreground">{module.progress}%</span>
                </div>
              </div>
              <div className="space-y-1">
                {module.lessons.map((lesson) => {
                  const isActive = lesson.id === activeLesson.id;

                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      onClick={() => setActiveLessonId(lesson.id)}
                      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                        isActive
                          ? "bg-brand-medium/10 text-brand-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {lesson.completed ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                      ) : (
                        <PlayCircle className="h-4 w-4 shrink-0" />
                      )}
                      <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
                      <span className="text-xs">{lesson.duration}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </aside>
      </div>
    </StudentLayout>
  );
};

export default StudentCourseDashboardPage;
