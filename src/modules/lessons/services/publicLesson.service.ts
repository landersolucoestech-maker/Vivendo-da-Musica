import { supabase } from '@/integrations/supabase/client';

export const publicLessonService = {
  async resolveLessonId(courseSlug: string, lessonSlug: string): Promise<string | null> {
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id')
      .eq('slug', courseSlug)
      .eq('status', 'published')
      .maybeSingle();

    if (courseError) throw courseError;
    if (!course) return null;

    const { data: modules, error: modulesError } = await supabase
      .from('course_modules')
      .select('id')
      .eq('course_id', course.id);

    if (modulesError) throw modulesError;

    const moduleIds = (modules ?? []).map((module) => module.id);
    if (moduleIds.length === 0) return null;

    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id')
      .in('module_id', moduleIds)
      .eq('slug', lessonSlug)
      .eq('status', 'published')
      .maybeSingle();

    if (lessonError) throw lessonError;
    return lesson?.id ?? null;
  },
};
