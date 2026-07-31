import { useEffect, useState } from 'react';
import { Bell, BellOff, CheckCheck, Circle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import StudentLayout from '@/app/layouts/StudentLayout';
import { useNotifications } from '@/modules/dashboard/hooks/useNotifications';
import { studentService } from '@/modules/dashboard/services/student.service';
import type { StudentNotification } from '@/modules/dashboard/types/notification.types';
import EmptyState from '@/shared/components/EmptyState';
import FilterBar from '@/shared/components/FilterBar';
import { Button } from '@/shared/components/ui/button';

const FILTERS = ['Todas', 'Não lidas', 'curso', 'pedido', 'comunidade', 'sistema'];

const CATEGORY_LABELS: Record<string, string> = {
  curso: 'Curso',
  pedido: 'Pedido',
  comunidade: 'Comunidade',
  sistema: 'Sistema',
};

const NotificationsPage = () => {
  const { data } = useNotifications();
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [filter, setFilter] = useState('Todas');

  useEffect(() => {
    if (data) setNotifications(data);
  }, [data]);

  const filtered = notifications.filter((notification) => {
    if (filter === 'Todas') return true;
    if (filter === 'Não lidas') return !notification.read;
    return notification.category === filter;
  });

  const markAsRead = async (id: string) => {
    await studentService.markNotificationAsRead(id);
    setNotifications((current) => current.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)));
    await queryClient.invalidateQueries({ queryKey: ['student-notifications-unread-count'] });
  };

  const markAllAsRead = async () => {
    for (const notification of notifications.filter((item) => !item.read)) {
      await studentService.markNotificationAsRead(notification.id);
    }
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
    await queryClient.invalidateQueries({ queryKey: ['student-notifications-unread-count'] });
  };

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <StudentLayout>
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="vdm-eyebrow">Central de avisos</p>
          <h1 className="vdm-page-title mt-2">Notificações</h1>
          <p className="vdm-page-description">Acompanhe atualizações de cursos, pedidos, comunidade e plataforma.</p>
        </div>
        <Button variant="outline" onClick={() => void markAllAsRead()} disabled={unreadCount === 0}>
          <CheckCheck className="size-4" />
          Marcar todas como lidas
        </Button>
      </header>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="vdm-surface flex items-center gap-4 p-5">
          <span className="vdm-icon-button border-primary/25 bg-primary/10 text-primary"><Bell className="size-5" /></span>
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Total</p>
            <p className="mt-1 font-display text-2xl font-bold text-white">{notifications.length}</p>
          </div>
        </div>
        <div className="vdm-surface flex items-center gap-4 p-5">
          <span className="vdm-icon-button border-amber-400/25 bg-amber-400/10 text-amber-300"><Circle className="size-4 fill-current" /></span>
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Não lidas</p>
            <p className="mt-1 font-display text-2xl font-bold text-white">{unreadCount}</p>
          </div>
        </div>
      </div>

      <div className="mb-6 overflow-x-auto">
        <FilterBar options={FILTERS} value={filter} onChange={setFilter} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={BellOff} title="Nenhuma notificação nesta categoria" description="Novos avisos aparecerão aqui quando houver atualizações relevantes." />
      ) : (
        <div className="space-y-3">
          {filtered.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => void markAsRead(notification.id)}
              className={`group w-full rounded-xl border p-5 text-left transition ${
                notification.read
                  ? 'border-white/8 bg-card hover:border-white/16'
                  : 'border-primary/30 bg-primary/[0.06] hover:border-primary/50'
              }`}
            >
              <div className="flex items-start gap-4">
                <span className={`mt-1 size-2.5 shrink-0 rounded-full ${notification.read ? 'bg-white/20' : 'bg-primary shadow-[0_0_14px_rgba(138,43,226,0.6)]'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-semibold text-white">{notification.title}</p>
                    <span className="text-xs text-muted-foreground">{new Date(notification.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{notification.description}</p>
                  <span className="mt-3 inline-flex rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    {CATEGORY_LABELS[notification.category] ?? notification.category}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </StudentLayout>
  );
};

export default NotificationsPage;
