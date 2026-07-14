export interface StudentNotification {
  id: string;
  title: string;
  description: string;
  read: boolean;
  createdAt: string;
  category: 'curso' | 'pedido' | 'comunidade' | 'sistema';
  actionUrl: string | null;
}

export interface StudentSettings {
  notifications: {
    courseUpdates: boolean;
    communityActivity: boolean;
    marketingEmails: boolean;
  };
  privacy: {
    publicProfile: boolean;
    showProgress: boolean;
  };
  language: string;
  theme: 'Sistema' | 'Claro' | 'Escuro';
  subscriptionPlan: 'Gratuito' | 'Premium' | 'Enterprise';
}
