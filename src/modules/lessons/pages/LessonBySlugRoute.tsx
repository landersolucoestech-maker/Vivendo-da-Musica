import { useParams, Navigate } from "react-router-dom";
import LoadingState from "@/shared/components/LoadingState";
import EmptyState from "@/shared/components/EmptyState";
import PublicLayout from "@/app/layouts/PublicLayout";
import { useModules } from "@/modules/modules-manager/hooks/useModules";
import { slugify } from "@/shared/utils/utils";
import { ROUTES } from "@/shared/constants/routes";

/**
 * Resolves the public, SEO-friendly `/academia/:courseSlug/aulas/:lessonSlug`
 * URL to the real lesson id and hands off to the canonical player route.
 * Lessons don't have a `slug` column, so the match is computed client-side
 * from the lesson title — good enough for navigation, not a backend field.
 */
const LessonBySlugRoute = () => {
  const { lessonSlug } = useParams();
  const { data: modules, isLoading } = useModules();

  if (isLoading) {
    return <PublicLayout><LoadingState rows={2} className="h-16 rounded-lg" /></PublicLayout>;
  }

  const lesson = modules
    ?.flatMap((module) => module.lessons)
    .find((l) => slugify(l.title) === lessonSlug);

  if (!lesson) {
    return (
      <PublicLayout>
        <EmptyState title="Aula não encontrada" description="Verifique o link ou volte para o curso." />
      </PublicLayout>
    );
  }

  return <Navigate to={ROUTES.lesson(lesson.id)} replace />;
};

export default LessonBySlugRoute;
