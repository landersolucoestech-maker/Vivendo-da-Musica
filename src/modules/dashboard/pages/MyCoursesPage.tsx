import { useNavigate } from "react-router-dom";
import StudentLayout from "@/app/layouts/StudentLayout";
import PageHeader from "@/shared/components/PageHeader";
import { Button } from "@/shared/components/ui/button";
import { Progress } from "@/shared/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/components/ui/tabs";
import EmptyState from "@/shared/components/EmptyState";
import LoadingState from "@/shared/components/LoadingState";
import ErrorState from "@/shared/components/ErrorState";
import { ROUTES } from "@/shared/constants/routes";
import { useEnrolledCourses } from "@/modules/dashboard/hooks/useEnrolledCourses";
import type { EnrolledStudentCourse } from "@/modules/dashboard/services/studentCourses.service";

const MyCoursesPage = () => {
  const navigate = useNavigate();
  const { data: courses = [], isLoading, isError, refetch } = useEnrolledCourses();

  const buckets = {
    "em-andamento": courses.filter((course) => course.progress > 0 && course.progress < 100),
    "nao-iniciados": courses.filter((course) => course.progress === 0),
    concluidos: courses.filter((course) => course.progress === 100),
  };

  const renderList = (list: EnrolledStudentCourse[]) => {
    if (!list.length) return <EmptyState title="Nenhum curso nessa categoria ainda." />;
    return (
      <div className="space-y-4">
        {list.map((course) => (
          <div key={course.id} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center">
            <div className="h-32 w-full shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-violet-600 to-indigo-950 sm:h-16 sm:w-24">
              {course.thumbnailUrl && <img src={course.thumbnailUrl} alt={course.title} className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{course.title}</p>
              <div className="mt-2 flex items-center gap-3">
                <Progress value={course.progress} aria-label={`Progresso do curso ${course.title}`} className="h-2 flex-1" />
                <span className="shrink-0 text-xs text-muted-foreground">{course.progress}%</span>
              </div>
            </div>
            <Button className="w-full shrink-0 sm:w-auto" onClick={() => navigate(ROUTES.studentCourse(course.id))}>
              {course.progress === 0 ? "Comecar" : course.progress === 100 ? "Revisar" : "Continuar"}
            </Button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <StudentLayout>
      <PageHeader title="Meus Cursos" subtitle="Acompanhe o progresso real de cada curso matriculado." />
      {isLoading ? <LoadingState rows={4} /> : isError ? (
        <ErrorState title="Nao foi possivel carregar seus cursos" onRetry={() => void refetch()} />
      ) : (
        <Tabs defaultValue="em-andamento">
          <TabsList className="mb-6">
            <TabsTrigger value="em-andamento">Em andamento ({buckets["em-andamento"].length})</TabsTrigger>
            <TabsTrigger value="nao-iniciados">Nao iniciados ({buckets["nao-iniciados"].length})</TabsTrigger>
            <TabsTrigger value="concluidos">Concluidos ({buckets.concluidos.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="em-andamento">{renderList(buckets["em-andamento"])}</TabsContent>
          <TabsContent value="nao-iniciados">{renderList(buckets["nao-iniciados"])}</TabsContent>
          <TabsContent value="concluidos">{renderList(buckets.concluidos)}</TabsContent>
        </Tabs>
      )}
    </StudentLayout>
  );
};

export default MyCoursesPage;
