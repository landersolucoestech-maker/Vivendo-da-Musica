import { supabase } from '@/integrations/supabase/client';
import type { LessonProgress } from '@/modules/lessons/hooks/useUserProgress';
import type { CourseModule } from '@/modules/modules-manager/types/courseModule';
import { isDevAuthBypassEnabled } from '@/shared/utils/devAuthBypass';
import { DEV_IDENTITY_IDS } from '@/shared/utils/devIdentity';

export interface StudentCourseAccess {
  course: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    thumbnail_url: string | null;
    price_cents: number;
    currency: string;
  };
  enrollment: {
    id: string;
    status: 'active' | 'revoked';
    source: 'manual' | 'stripe';
    created_at: string;
  };
  modules: CourseModule[];
  progress: LessonProgress[];
}

const formatDuration = (minutes: number | null) => {
  if (!minutes) return '15:00';
  return `${minutes}:00`;
};

const loadCourseAccess = async (courseId: string, userId: string): Promise<StudentCourseAccess | null> => {
  const { data: enrollment, error: enrollmentError } = await supabase
    .from('enrollments')
    .select('id, status, source, created_at')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .eq('status', 'active')
    .maybeSingle();

  if (enrollmentError) throw enrollmentError;
  if (!enrollment) return null;

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, title, slug, description, thumbnail_url, price_cents, currency')
    .eq('id', courseId)
    .eq('status', 'published')
    .maybeSingle();

  if (courseError) throw courseError;
  if (!course) return null;

  const { data: modules, error: modulesError } = await supabase
    .from('course_modules')
    .select(`
      id,
      title,
      description,
      order_index,
      course_id,
      lessons (
        id,
        title,
        description,
        video_url,
        duration_minutes,
        order_index,
        module_id,
        status
      )
    `)
    .eq('course_id', courseId)
    .order('order_index', { ascending: true });

  if (modulesError) throw modulesError;

  const publishedModules = (modules ?? []).map((module) => ({
    ...module,
    lessons: (module.lessons ?? []).filter((lesson) => lesson.status === 'published'),
  }));

  const lessonIds = publishedModules.flatMap((module) => module.lessons.map((lesson) => lesson.id));

  const { data: progress, error: progressError } = lessonIds.length
    ? await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', userId)
        .in('lesson_id', lessonIds)
    : { data: [], error: null };

  if (progressError) throw progressError;

  return {
    course,
    enrollment,
    modules: publishedModules.map((module) => ({
      id: module.id,
      title: module.title,
      description: module.description || 'Descrição não disponível',
      progress: 0,
      lessons: module.lessons
        .slice()
        .sort((a, b) => a.order_index - b.order_index)
        .map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          description: lesson.description || 'Descrição não disponível',
          videoUrl: lesson.video_url || '',
          duration: formatDuration(lesson.duration_minutes),
          completed: false,
          order_index: lesson.order_index,
          module_id: lesson.module_id || module.id,
        })),
    })),
    progress: (progress ?? []) as LessonProgress[],
  };
};

export const studentCourseAccessService = {
  async getCourseAccess(courseId: string): Promise<StudentCourseAccess | null> {
    if (isDevAuthBypassEnabled) {
      return loadCourseAccess(courseId, DEV_IDENTITY_IDS.student);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error('Usuário não autenticado');

    return loadCourseAccess(courseId, user.id);
  },
};
