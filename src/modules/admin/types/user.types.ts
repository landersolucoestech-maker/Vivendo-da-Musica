export interface MockUser {
  name: string;
  email: string;
  role: 'student' | 'instructor' | 'producer' | 'admin' | 'super_admin';
  status: 'Ativo' | 'Inativo';
  subscriptionPlan: 'Gratuito' | 'Premium';
  joinedAt: string;
}
