import { useQuery } from '@tanstack/react-query';
import { Navigate, useParams } from 'react-router-dom';

import PublicLayout from '@/app/layouts/PublicLayout';
import { publicLessonService } from '@/modules/lessons/services/publicLesson.service';
import EmptyState from '@/shared/components/EmptyState';
import LoadingState from '@/shared/components/LoadingState';
import { ROUTES } from '@/shared/constants/routes';

/**
 * Resolves the public, SEO-friendly `/academia/:courseSlug/aulas/:lessonSlug`
 * URL through the persisted course and lesson slugs before handing off to the
 * canonical lesson player route.
 */
const LessonBySlugRoute = () => {
  const { courseSlug, lessonSlug } = useParams();
  const { data: lessonId, isLoading, isError } = useQuery({
    queryKey: ['public-lesson-route', courseSlug, lessonSlug],
    queryFn: () => publicLessonService.resolveLessonId(courseSlug!, lessonSlug!),
    enabled: Boolean(courseSlug && lessonSlug),
  });

  if (isLoading) {
    return <PublicLayout><LoadingState rows={2} className="h-16 rounded-lg" /></PublicLayout>;
  }

  if (isError || !lessonId) {
    return (
      <PublicLayout>
        <EmptyState title="Aula não encontrada" description="Verifique o link ou volte para o curso." />
      </PublicLayout>
    );
  }

  return <Navigate to={ROUTES.lesson(lessonId)} replace />;
};

export default LessonBySlugRoute;
