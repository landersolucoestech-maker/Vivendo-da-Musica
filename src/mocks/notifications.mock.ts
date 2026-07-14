import type { MockNotification } from "@/modules/dashboard/types/notification.types";

export const MOCK_NOTIFICATIONS: MockNotification[] = [
  { id: 'notif-1', title: 'Nova aula disponível', description: 'O módulo 3 de Produção Musical foi liberado.', read: false, createdAt: 'há 2 horas', category: 'curso' },
  { id: 'notif-2', title: 'Pedido confirmado', description: 'Seu pedido #1042 foi pago com sucesso.', read: false, createdAt: 'há 1 dia', category: 'pedido' },
  { id: 'notif-3', title: 'Novo comentário', description: 'Lucas Beats comentou no seu post na comunidade.', read: true, createdAt: 'há 3 dias', category: 'comunidade' },
  { id: 'notif-4', title: 'Atualização da plataforma', description: 'Nova área de Eventos disponível na sua conta.', read: true, createdAt: 'há 1 semana', category: 'sistema' },
];
