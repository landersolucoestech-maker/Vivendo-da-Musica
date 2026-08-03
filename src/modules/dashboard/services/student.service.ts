import { supabase } from '@/integrations/supabase/client';
import type { Favorite, FavoriteTargetType } from '@/modules/dashboard/types/favorite.types';
import type { StudentNotification, StudentSettings } from '@/modules/dashboard/types/notification.types';
import type { SupportFaqItem, SupportTicket } from '@/modules/dashboard/types/support.types';
import { ROUTES } from '@/shared/constants/routes';
import { formatPriceOrFree } from '@/shared/utils/formatters';

interface NotificationRow {
  id: string;
  title: string;
  body: string;
  category: 'course' | 'order' | 'community' | 'system';
  action_url: string | null;
  read_at: string | null;
  created_at: string;
}

interface PreferencesRow {
  course_updates: boolean;
  community_activity: boolean;
  marketing_emails: boolean;
  public_profile: boolean;
  show_progress: boolean;
  locale: string;
  theme: 'system' | 'light' | 'dark';
}

interface FavoriteRow {
  id: string;
  course_id: string | null;
  beat_id: string | null;
  content_id: string | null;
  courses: { title: string; slug: string; price_cents: number; currency: string } | null;
  beats: { title: string; slug: string; genre: string } | null;
  academy_contents: { title: string; slug: string; category: string | null } | null;
}

interface SupportTicketRow {
  id: string;
  ticket_code: string;
  user_id: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
}

interface SupportFaqRow {
  id: string;
  question: string;
  answer: string;
}

const categoryMap: Record<NotificationRow['category'], StudentNotification['category']> = {
  course: 'curso',
  order: 'pedido',
  community: 'comunidade',
  system: 'sistema',
};

const themeMap: Record<PreferencesRow['theme'], StudentSettings['theme']> = {
  system: 'Sistema',
  light: 'Claro',
  dark: 'Escuro',
};

const getUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Entre na sua conta para acessar esta área.');
  return data.user;
};

const mapNotification = (row: NotificationRow): StudentNotification => ({
  id: row.id,
  title: row.title,
  description: row.body,
  read: row.read_at !== null,
  createdAt: row.created_at,
  category: categoryMap[row.category],
  actionUrl: row.action_url,
});

const defaultSettings: StudentSettings = {
  notifications: { courseUpdates: true, communityActivity: true, marketingEmails: false },
  privacy: { publicProfile: true, showProgress: false },
  language: 'Português (Brasil)',
  theme: 'Sistema',
};

export const studentService = {
  async listNotifications(): Promise<StudentNotification[]> {
    const user = await getUser();
    const table = supabase.from as unknown as (name: 'student_notifications') => {
      select(columns: string): {
        eq(column: string, value: string): {
          order(column: string, options: { ascending: boolean }): Promise<{
            data: NotificationRow[] | null;
            error: { message: string } | null;
          }>;
        };
      };
    };

    const { data, error } = await table('student_notifications')
      .select('id, title, body, category, action_url, read_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Não foi possível carregar as notificações: ${error.message}`);
    return (data ?? []).map(mapNotification);
  },

  async countUnreadNotifications(): Promise<number> {
    const user = await getUser();
    const table = supabase.from as unknown as (name: 'student_notifications') => {
      select(columns: string, options: { count: 'exact'; head: true }): {
        eq(column: string, value: string): {
          is(column: string, value: null): Promise<{
            count: number | null;
            error: { message: string } | null;
          }>;
        };
      };
    };

    const { count, error } = await table('student_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null);

    if (error) throw new Error(`Não foi possível contar as notificações: ${error.message}`);
    return count ?? 0;
  },

  async markNotificationAsRead(id: string): Promise<{ success: true }> {
    const user = await getUser();
    const table = supabase.from as unknown as (name: 'student_notifications') => {
      update(values: { read_at: string }): {
        eq(column: string, value: string): {
          eq(column: string, value: string): Promise<{ error: { message: string } | null }>;
        };
      };
    };

    const { error } = await table('student_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw new Error(`Não foi possível atualizar a notificação: ${error.message}`);
    return { success: true };
  },

  async listSupportTickets(): Promise<SupportTicket[]> {
    const user = await getUser();
    const table = supabase.from as unknown as (name: 'support_tickets') => {
      select(columns: string): {
        order(column: string, options: { ascending: boolean }): Promise<{
          data: SupportTicketRow[] | null;
          error: { message: string } | null;
        }>;
      };
    };

    const { data, error } = await table('support_tickets')
      .select('id, ticket_code, user_id, subject, message, status, priority, created_at')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Não foi possível carregar os tickets: ${error.message}`);

    const rows = data ?? [];
    const profileTable = supabase.from as unknown as (name: 'user_profiles') => {
      select(columns: string): {
        in(column: string, values: string[]): Promise<{
          data: { user_id: string; full_name: string | null }[] | null;
          error: { message: string } | null;
        }>;
      };
    };

    const userIds = [...new Set(rows.map((row) => row.user_id))];
    const profiles = userIds.length
      ? await profileTable('user_profiles').select('user_id, full_name').in('user_id', userIds)
      : { data: [], error: null };

    if (profiles.error) throw new Error(`Não foi possível carregar os solicitantes: ${profiles.error.message}`);

    const names = new Map((profiles.data ?? []).map((profile) => [profile.user_id, profile.full_name]));
    const statusMap = { open: 'aberto', in_progress: 'em-andamento', resolved: 'resolvido' } as const;
    const priorityMap = { low: 'baixa', medium: 'média', high: 'alta' } as const;

    return rows.map((row) => ({
      id: row.ticket_code,
      subject: row.subject,
      message: row.message,
      requester: row.user_id === user.id
        ? names.get(row.user_id) || user.email || 'Você'
        : names.get(row.user_id) || `Usuário ${row.user_id.slice(0, 8)}`,
      status: statusMap[row.status],
      priority: priorityMap[row.priority],
      createdAt: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(row.created_at)),
    }));
  },

  async listSupportFaq(): Promise<SupportFaqItem[]> {
    await getUser();
    const table = supabase.from as unknown as (name: 'support_faq') => {
      select(columns: string): {
        order(column: string, options: { ascending: boolean }): Promise<{
          data: SupportFaqRow[] | null;
          error: { message: string } | null;
        }>;
      };
    };

    const { data, error } = await table('support_faq')
      .select('id, question, answer')
      .order('sort_order', { ascending: true });

    if (error) throw new Error(`Não foi possível carregar as perguntas frequentes: ${error.message}`);
    return data ?? [];
  },

  async openSupportTicket(payload: { subject: string; message: string }): Promise<{ success: true }> {
    const user = await getUser();
    const table = supabase.from as unknown as (name: 'support_tickets') => {
      insert(values: { user_id: string; subject: string; message: string }): Promise<{
        error: { message: string } | null;
      }>;
    };

    const { error } = await table('support_tickets').insert({
      user_id: user.id,
      subject: payload.subject.trim(),
      message: payload.message.trim(),
    });

    if (error) throw new Error(`Não foi possível abrir o ticket: ${error.message}`);
    return { success: true };
  },

  async listFavorites(): Promise<Favorite[]> {
    const user = await getUser();
    const table = supabase.from as unknown as (name: 'student_favorites') => {
      select(columns: string): {
        eq(column: string, value: string): {
          order(column: string, options: { ascending: boolean }): Promise<{
            data: FavoriteRow[] | null;
            error: { message: string } | null;
          }>;
        };
      };
    };

    const { data, error } = await table('student_favorites')
      .select('id, course_id, beat_id, content_id, courses(title, slug, price_cents, currency), beats(title, slug, genre), academy_contents(title, slug, category)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Não foi possível carregar os favoritos: ${error.message}`);

    return (data ?? []).flatMap((row): Favorite[] => {
      if (row.course_id && row.courses) {
        return [{
          id: row.id,
          targetId: row.course_id,
          type: 'curso',
          title: row.courses.title,
          meta: formatPriceOrFree(row.courses.price_cents, row.courses.currency),
          href: ROUTES.academyCourse(row.courses.slug),
        }];
      }

      if (row.beat_id && row.beats) {
        return [{
          id: row.id,
          targetId: row.beat_id,
          type: 'produto',
          title: row.beats.title,
          meta: row.beats.genre,
          href: ROUTES.marketplaceBeat(row.beats.slug),
        }];
      }

      if (row.content_id && row.academy_contents) {
        return [{
          id: row.id,
          targetId: row.content_id,
          type: 'conteudo',
          title: row.academy_contents.title,
          meta: row.academy_contents.category ?? 'Conteúdo da Academia',
          href: ROUTES.academyCourse(row.academy_contents.slug),
        }];
      }

      return [];
    });
  },

  async addFavorite(type: FavoriteTargetType, targetId: string): Promise<{ success: true }> {
    const user = await getUser();
    const column = type === 'curso' ? 'course_id' : type === 'produto' ? 'beat_id' : 'content_id';
    const table = supabase.from as unknown as (name: 'student_favorites') => {
      insert(values: Record<string, string>): Promise<{
        error: { code?: string; message: string } | null;
      }>;
    };

    const { error } = await table('student_favorites').insert({ user_id: user.id, [column]: targetId });
    if (error && error.code !== '23505') throw new Error(`Não foi possível salvar o favorito: ${error.message}`);
    return { success: true };
  },

  async removeFavorite(id: string): Promise<{ success: true }> {
    const user = await getUser();
    const table = supabase.from as unknown as (name: 'student_favorites') => {
      delete(): {
        eq(column: string, value: string): {
          eq(column: string, value: string): Promise<{ error: { message: string } | null }>;
        };
      };
    };

    const { error } = await table('student_favorites')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw new Error(`Não foi possível remover o favorito: ${error.message}`);
    return { success: true };
  },

  async getStudentSettings(): Promise<StudentSettings> {
    const user = await getUser();
    const table = supabase.from as unknown as (name: 'student_preferences') => {
      select(columns: string): {
        eq(column: string, value: string): {
          maybeSingle(): Promise<{
            data: PreferencesRow | null;
            error: { message: string } | null;
          }>;
        };
      };
    };

    const { data, error } = await table('student_preferences')
      .select('course_updates, community_activity, marketing_emails, public_profile, show_progress, locale, theme')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw new Error(`Não foi possível carregar as configurações: ${error.message}`);
    if (!data) return defaultSettings;

    return {
      notifications: {
        courseUpdates: data.course_updates,
        communityActivity: data.community_activity,
        marketingEmails: data.marketing_emails,
      },
      privacy: {
        publicProfile: data.public_profile,
        showProgress: data.show_progress,
      },
      language: data.locale === 'pt-BR' ? 'Português (Brasil)' : data.locale,
      theme: themeMap[data.theme],
    };
  },

  async saveStudentSettings(settings: StudentSettings): Promise<{ success: true }> {
    const user = await getUser();
    const reverseTheme: Record<StudentSettings['theme'], PreferencesRow['theme']> = {
      Sistema: 'system',
      Claro: 'light',
      Escuro: 'dark',
    };
    const table = supabase.from as unknown as (name: 'student_preferences') => {
      upsert(values: Record<string, unknown>, options: { onConflict: string }): Promise<{
        error: { message: string } | null;
      }>;
    };

    const { error } = await table('student_preferences').upsert({
      user_id: user.id,
      course_updates: settings.notifications.courseUpdates,
      community_activity: settings.notifications.communityActivity,
      marketing_emails: settings.notifications.marketingEmails,
      public_profile: settings.privacy.publicProfile,
      show_progress: settings.privacy.showProgress,
      locale: settings.language === 'Português (Brasil)' ? 'pt-BR' : settings.language,
      theme: reverseTheme[settings.theme],
    }, { onConflict: 'user_id' });

    if (error) throw new Error(`Não foi possível salvar as configurações: ${error.message}`);
    return { success: true };
  },
};
