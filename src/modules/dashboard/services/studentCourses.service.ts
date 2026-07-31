import { supabase } from '@/integrations/supabase/client';
import { getEffectiveUserId } from '@/shared/utils/devIdentity';

export interface EnrolledStudentCourse {
  id: string;
  slug: string;
  title: string;
  progress: number;
  thumbnailUrl: string | null;
  enrolledAt: string;
}

interface EnrollmentRow {
  created_at: string;
  courses: {
    id: string;
    slug: string;
    title: string;
    thumbnail_url: string | null;
    course_modules: { lessons: { id: string }[] | null }[] | null;
  } | null;
}

interface ProgressRow {
  lesson_id: string;
  completed: boolean;
  progress_percentage: number;
}

export const studentCoursesService = {
  async listEnrolledCourses(): Promise<EnrolledStudentCourse[]> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    const userId = await getEffectiveUserId(authData.user?.id);

    const { data: enrollments, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('created_at, courses!inner(id, slug, title, thumbnail_url, course_modules(lessons(id)))')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (enrollmentError) throw new Error(`Não foi possível carregar as matrículas: ${enrollmentError.message}`);

    const typedEnrollments = (enrollments ?? []) as unknown as EnrollmentRow[];
    const lessonIds = typedEnrollments.flatMap((enrollment) =>
      (enrollment.courses?.course_modules ?? []).flatMap((module) =>
        (module.lessons ?? []).map((lesson) => lesson.id)
      )
    );

    let progressRows: ProgressRow[] = [];
    if (lessonIds.length) {
      const { data, error } = await supabase
        .from('lesson_progress')
        .select('lesson_id, completed, progress_percentage')
        .eq('user_id', userId)
        .in('lesson_id', lessonIds);

      if (error) throw new Error(`Não foi possível carregar o progresso: ${error.message}`);
      progressRows = (data ?? []) as ProgressRow[];
    }

    const progressByLesson = new Map(progressRows.map((row) => [
      row.lesson_id,
      row.completed ? 100 : Math.max(0, Math.min(100, row.progress_percentage)),
    ]));

    return typedEnrollments.flatMap((enrollment) => {
      const course = enrollment.courses;
      if (!course) return [];

      const courseLessonIds = (course.course_modules ?? []).flatMap((module) =>
        (module.lessons ?? []).map((lesson) => lesson.id)
      );
      const progress = courseLessonIds.length
        ? Math.round(courseLessonIds.reduce((sum, id) => sum + (progressByLesson.get(id) ?? 0), 0) / courseLessonIds.length)
        : 0;

      return [{
        id: course.id,
        slug: course.slug,
        title: course.title,
        progress,
        thumbnailUrl: course.thumbnail_url,
        enrolledAt: enrollment.created_at,
      }];
    });
  },
};
