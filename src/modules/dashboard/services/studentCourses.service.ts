import { supabase } from "@/integrations/supabase/client";

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
    if (authError || !authData.user) throw new Error("Entre na sua conta para consultar os cursos.");

    const enrollmentsTable = supabase.from as unknown as (table: "enrollments") => {
      select(columns: string): {
        eq(column: string, value: string): {
          eq(column: string, value: string): {
            order(column: string, options: { ascending: boolean }): Promise<{
              data: EnrollmentRow[] | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    };
    const { data: enrollments, error: enrollmentError } = await enrollmentsTable("enrollments")
      .select("created_at, courses!inner(id, slug, title, thumbnail_url, course_modules(lessons(id)))")
      .eq("user_id", authData.user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });
    if (enrollmentError) throw new Error(`Nao foi possivel carregar as matriculas: ${enrollmentError.message}`);

    const lessonIds = (enrollments ?? []).flatMap((enrollment) =>
      (enrollment.courses?.course_modules ?? []).flatMap((module) =>
        (module.lessons ?? []).map((lesson) => lesson.id)
      )
    );
    let progressRows: ProgressRow[] = [];
    if (lessonIds.length) {
      const progressTable = supabase.from as unknown as (table: "lesson_progress") => {
        select(columns: string): {
          eq(column: string, value: string): {
            in(column: string, values: string[]): Promise<{ data: ProgressRow[] | null; error: { message: string } | null }>;
          };
        };
      };
      const { data, error } = await progressTable("lesson_progress")
        .select("lesson_id, completed, progress_percentage")
        .eq("user_id", authData.user.id)
        .in("lesson_id", lessonIds);
      if (error) throw new Error(`Nao foi possivel carregar o progresso: ${error.message}`);
      progressRows = data ?? [];
    }
    const progressByLesson = new Map(progressRows.map((row) => [
      row.lesson_id,
      row.completed ? 100 : Math.max(0, Math.min(100, row.progress_percentage)),
    ]));

    return (enrollments ?? []).flatMap((enrollment) => {
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
