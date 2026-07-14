import { useEffect, useState } from "react";
import { BellOff, CheckCheck } from "lucide-react";
import StudentLayout from "@/app/layouts/StudentLayout";
import PageHeader from "@/shared/components/PageHeader";
import EmptyState from "@/shared/components/EmptyState";
import FilterBar from "@/shared/components/FilterBar";
import { Button } from "@/shared/components/ui/button";
import { useNotifications } from "@/modules/dashboard/hooks/useNotifications";
import { studentService } from "@/modules/dashboard/services/student.service";
import type { StudentNotification } from "@/modules/dashboard/types/notification.types";
import { useQueryClient } from "@tanstack/react-query";

const FILTERS = ['Todas', 'Não lidas', 'curso', 'pedido', 'comunidade', 'sistema'];

const NotificationsPage = () => {
  const { data } = useNotifications();
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [filter, setFilter] = useState('Todas');

  useEffect(() => {
    if (data) setNotifications(data);
  }, [data]);

  const filtered = notifications.filter((n) => {
    if (filter === 'Todas') return true;
    if (filter === 'Não lidas') return !n.read;
    return n.category === filter;
  });

  const markAsRead = async (id: string) => {
    await studentService.markNotificationAsRead(id);
    setNotifications((current) => current.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await queryClient.invalidateQueries({ queryKey: ['student-notifications-unread-count'] });
  };

  const markAllAsRead = async () => {
    for (const notification of notifications.filter((item) => !item.read)) {
      await studentService.markNotificationAsRead(notification.id);
    }
    setNotifications((current) => current.map((n) => ({ ...n, read: true })));
    await queryClient.invalidateQueries({ queryKey: ['student-notifications-unread-count'] });
  };

  return (
    <StudentLayout>
      <PageHeader
        title="Notificações"
        subtitle="Atualizações de cursos, pedidos e comunidade."
        actions={
          <Button variant="outline" className="border-border" onClick={markAllAsRead}>
            <CheckCheck className="w-4 h-4 mr-2" />
            Marcar todas como lidas
          </Button>
        }
      />

      <div className="mb-5">
        <FilterBar options={FILTERS} value={filter} onChange={setFilter} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={BellOff} title="Nenhuma notificação aqui" />
      ) : (
        <div className="space-y-2">
          {filtered.map((notification) => (
            <button
              key={notification.id}
              onClick={() => markAsRead(notification.id)}
              className={`w-full text-left rounded-lg border p-4 transition-colors ${
                notification.read ? 'border-border bg-card' : 'border-brand-medium/30 bg-brand-medium/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">{notification.title}</p>
                <span className="text-xs text-muted-foreground">{new Date(notification.createdAt).toLocaleDateString('pt-BR')}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{notification.description}</p>
            </button>
          ))}
        </div>
      )}
    </StudentLayout>
  );
};

export default NotificationsPage;
