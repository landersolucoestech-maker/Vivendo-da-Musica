import { supabase } from '@/integrations/supabase/client';
import type { UserRole } from '@/modules/auth/types/role';

export interface AdminUserRecord {
  userId: string;
  name: string;
  role: UserRole;
  joinedAt: string;
  activeEnrollments: number;
  averageProgress: number;
  completedLessons: number;
}

export const adminUsersService = {
  async listUsers(): Promise<AdminUserRecord[]> {
    const [profilesResult, enrollmentsResult, progressResult] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('user_id, full_name, role, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('enrollments')
        .select('user_id, status'),
      supabase
        .from('lesson_progress')
        .select('user_id, completed, progress_percentage'),
    ]);

    if (profilesResult.error) throw profilesResult.error;
    if (enrollmentsResult.error) throw enrollmentsResult.error;
    if (progressResult.error) throw progressResult.error;

    const enrollmentCount = new Map<string, number>();
    for (const enrollment of enrollmentsResult.data ?? []) {
      if (enrollment.status === 'active') {
        enrollmentCount.set(enrollment.user_id, (enrollmentCount.get(enrollment.user_id) ?? 0) + 1);
      }
    }

    const progressByUser = new Map<string, { total: number; rows: number; completed: number }>();
    for (const progress of progressResult.data ?? []) {
      const current = progressByUser.get(progress.user_id) ?? { total: 0, rows: 0, completed: 0 };
      current.total += Math.max(0, Math.min(100, progress.progress_percentage));
      current.rows += 1;
      if (progress.completed) current.completed += 1;
      progressByUser.set(progress.user_id, current);
    }

    return (profilesResult.data ?? []).map((profile) => {
      const progress = progressByUser.get(profile.user_id);
      return {
        userId: profile.user_id,
        name: profile.full_name ?? 'Usuário sem nome definido',
        role: profile.role as UserRole,
        joinedAt: profile.created_at,
        activeEnrollments: enrollmentCount.get(profile.user_id) ?? 0,
        averageProgress: progress?.rows ? Math.round(progress.total / progress.rows) : 0,
        completedLessons: progress?.completed ?? 0,
      };
    });
  },

  async listStudents(): Promise<AdminUserRecord[]> {
    return (await this.listUsers()).filter((user) => user.role === 'student');
  },
};
