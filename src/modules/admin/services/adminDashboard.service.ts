import { supabase } from '@/integrations/supabase/client';

export interface AdminDashboardSummary {
  profiles: number;
  publishedCourses: number;
  activeEnrollments: number;
  completedLessons: number;
  comments: number;
  affiliateConversions: number;
}

export interface AdminActivityPoint {
  date: string;
  value: number;
}

export interface AdminCourseOverview {
  id: string;
  title: string;
  status: string;
  modules: number;
  lessons: number;
}

export interface AdminRecentActivity {
  id: string;
  title: string;
  description: string;
  occurredAt: string;
}

interface LessonRelation {
  title: string;
}

interface ProgressActivityRow {
  id: string;
  completed: boolean;
  progress_percentage: number;
  updated_at: string;
  lessons: LessonRelation | LessonRelation[] | null;
}

interface CommentActivityRow {
  id: string;
  body: string;
  created_at: string;
  lessons: LessonRelation | LessonRelation[] | null;
}

const formatDayKey = (value: string) => new Date(value).toISOString().slice(0, 10);
const relationTitle = (value: LessonRelation | LessonRelation[] | null | undefined) =>
  Array.isArray(value) ? value[0]?.title ?? 'Aula' : value?.title ?? 'Aula';

const countRows = async (
  tableName: 'user_profiles' | 'courses' | 'enrollments' | 'lesson_progress' | 'lesson_comments' | 'affiliate_conversions',
  filters?: Array<[string, string | boolean]>,
) => {
  let query = supabase.from(tableName).select('*', { count: 'exact', head: true });
  for (const [column, value] of filters ?? []) query = query.eq(column, value);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
};

export const adminDashboardService = {
  async getSummary(): Promise<AdminDashboardSummary> {
    const [profiles, publishedCourses, activeEnrollments, completedLessons, comments, affiliateConversions] = await Promise.all([
      countRows('user_profiles'),
      countRows('courses', [['status', 'published']]),
      countRows('enrollments', [['status', 'active']]),
      countRows('lesson_progress', [['completed', true]]),
      countRows('lesson_comments'),
      countRows('affiliate_conversions', [['status', 'approved']]),
    ]);

    return { profiles, publishedCourses, activeEnrollments, completedLessons, comments, affiliateConversions };
  },

  async getLearningSeries(): Promise<AdminActivityPoint[]> {
    const since = new Date(Date.now() - 29 * 86_400_000).toISOString();
    const { data, error } = await supabase
      .from('lesson_progress')
      .select('updated_at')
      .eq('completed', true)
      .gte('updated_at', since)
      .order('updated_at', { ascending: true });

    if (error) throw error;
    const totals = new Map<string, number>();
    for (const row of data ?? []) {
      const key = formatDayKey(row.updated_at);
      totals.set(key, (totals.get(key) ?? 0) + 1);
    }

    return Array.from({ length: 30 }, (_, index) => {
      const date = new Date(Date.now() - (29 - index) * 86_400_000).toISOString().slice(0, 10);
      return {
        date: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' })
          .format(new Date(`${date}T12:00:00Z`)),
        value: totals.get(date) ?? 0,
      };
    });
  },

  async getCourses(): Promise<AdminCourseOverview[]> {
    const { data, error } = await supabase
      .from('courses')
      .select('id, title, status, course_modules(id, lessons(id))')
      .order('updated_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    return (data ?? []).map((course) => ({
      id: course.id,
      title: course.title,
      status: course.status,
      modules: course.course_modules?.length ?? 0,
      lessons: (course.course_modules ?? []).reduce(
        (total, module) => total + (module.lessons?.length ?? 0),
        0,
      ),
    }));
  },

  async getRecentActivity(): Promise<AdminRecentActivity[]> {
    const [progressResult, commentsResult] = await Promise.all([
      supabase
        .from('lesson_progress')
        .select('id, completed, progress_percentage, updated_at, lessons(title)')
        .order('updated_at', { ascending: false })
        .limit(6),
      supabase
        .from('lesson_comments')
        .select('id, body, created_at, lessons(title)')
        .order('created_at', { ascending: false })
        .limit(4),
    ]);

    if (progressResult.error) throw progressResult.error;
    if (commentsResult.error) throw commentsResult.error;

    const progress = ((progressResult.data ?? []) as unknown as ProgressActivityRow[]).map((item) => ({
      id: `progress-${item.id}`,
      title: item.completed ? 'Aula concluída' : 'Progresso atualizado',
      description: `${relationTitle(item.lessons)} · ${item.progress_percentage}%`,
      occurredAt: item.updated_at,
    }));

    const comments = ((commentsResult.data ?? []) as unknown as CommentActivityRow[]).map((item) => ({
      id: `comment-${item.id}`,
      title: 'Novo comentário em aula',
      description: `${relationTitle(item.lessons)} · ${item.body.slice(0, 80)}`,
      occurredAt: item.created_at,
    }));

    return [...progress, ...comments]
      .sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt))
      .slice(0, 10);
  },
};
