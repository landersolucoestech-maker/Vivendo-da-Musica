import { supabase } from "@/integrations/supabase/client";
import { isDevAuthBypassEnabled } from "@/shared/utils/devAuthBypass";
import { DEV_COURSE_ACCESS_META, MOCK_MODULES } from "@/shared/utils/devMockData";
import type { CourseModule } from "@/modules/modules-manager/types/courseModule";
import type { LessonProgress } from "@/modules/lessons/hooks/useUserProgress";

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
    status: "active" | "revoked";
    source: "manual" | "stripe";
    created_at: string;
  };
  modules: CourseModule[];
  progress: LessonProgress[];
}

const formatDuration = (minutes: number | null) => {
  if (!minutes) return "15:00";
  return `${minutes}:00`;
};

export const studentCourseAccessService = {
  async getCourseAccess(courseId: string): Promise<StudentCourseAccess | null> {
    if (isDevAuthBypassEnabled) {
      return {
        course: {
          id: courseId,
          title: DEV_COURSE_ACCESS_META.title,
          slug: DEV_COURSE_ACCESS_META.slug,
          description: DEV_COURSE_ACCESS_META.description,
          thumbnail_url: null,
          price_cents: DEV_COURSE_ACCESS_META.priceCents,
          currency: DEV_COURSE_ACCESS_META.currency,
        },
        enrollment: {
          id: "mock-enrollment",
          status: "active",
          source: "manual",
          created_at: new Date().toISOString(),
        },
        modules: MOCK_MODULES,
        progress: [],
      };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Usuario nao autenticado");

    const { data: enrollment, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("id, status, source, created_at")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .eq("status", "active")
      .maybeSingle();

    if (enrollmentError) throw enrollmentError;
    if (!enrollment) return null;

    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, title, slug, description, thumbnail_url, price_cents, currency")
      .eq("id", courseId)
      .maybeSingle();

    if (courseError) throw courseError;
    if (!course) return null;

    const { data: modules, error: modulesError } = await supabase
      .from("course_modules")
      .select(
        `
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
          module_id
        )
      `
      )
      .eq("course_id", courseId)
      .order("order_index", { ascending: true });

    if (modulesError) throw modulesError;

    const lessonIds = (modules ?? []).flatMap((module) =>
      (module.lessons ?? []).map((lesson) => lesson.id)
    );

    const { data: progress, error: progressError } = lessonIds.length
      ? await supabase
          .from("lesson_progress")
          .select("*")
          .eq("user_id", user.id)
          .in("lesson_id", lessonIds)
      : { data: [], error: null };

    if (progressError) throw progressError;

    return {
      course,
      enrollment,
      modules: (modules ?? []).map((module) => ({
        id: module.id,
        title: module.title,
        description: module.description || "Descricao nao disponivel",
        progress: 0,
        lessons: (module.lessons ?? [])
          .slice()
          .sort((a, b) => a.order_index - b.order_index)
          .map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            description: lesson.description || "Descricao nao disponivel",
            videoUrl: lesson.video_url || "",
            duration: formatDuration(lesson.duration_minutes),
            completed: false,
            order_index: lesson.order_index,
            module_id: lesson.module_id || module.id,
          })),
      })),
      progress: (progress ?? []) as LessonProgress[],
    };
  },
};
