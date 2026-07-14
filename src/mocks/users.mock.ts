import type { MockUser } from "@/modules/admin/types/user.types";

export const MOCK_USERS: MockUser[] = [
  { name: 'Ana Oliveira', email: 'ana@exemplo.com', role: 'student', status: 'Ativo', subscriptionPlan: 'Premium', joinedAt: '02/03/2026' },
  { name: 'Lucas Beats', email: 'lucas@exemplo.com', role: 'instructor', status: 'Ativo', subscriptionPlan: 'Premium', joinedAt: '14/01/2026' },
  { name: 'João Millen', email: 'joao@exemplo.com', role: 'instructor', status: 'Ativo', subscriptionPlan: 'Premium', joinedAt: '20/04/2026' },
  { name: 'Mariana Santos', email: 'mariana@exemplo.com', role: 'student', status: 'Inativo', subscriptionPlan: 'Gratuito', joinedAt: '11/02/2026' },
  { name: 'Pedro Santos', email: 'pedro@exemplo.com', role: 'student', status: 'Ativo', subscriptionPlan: 'Gratuito', joinedAt: '05/05/2026' },
  { name: 'Carla Mendes', email: 'carla@exemplo.com', role: 'student', status: 'Ativo', subscriptionPlan: 'Premium', joinedAt: '18/05/2026' },
  { name: 'Felipe Rodrigues', email: 'felipe@exemplo.com', role: 'student', status: 'Ativo', subscriptionPlan: 'Gratuito', joinedAt: '22/05/2026' },
  { name: 'Rafael Andrade', email: 'rafael@exemplo.com', role: 'instructor', status: 'Ativo', subscriptionPlan: 'Premium', joinedAt: '10/01/2026' },
  { name: 'Mariana Costa', email: 'mariana.costa@exemplo.com', role: 'instructor', status: 'Ativo', subscriptionPlan: 'Premium', joinedAt: '15/01/2026' },
  { name: 'Luan Teles', email: 'luan@exemplo.com', role: 'instructor', status: 'Ativo', subscriptionPlan: 'Premium', joinedAt: '08/01/2026' },
  { name: 'Beatriz Lima', email: 'beatriz@exemplo.com', role: 'student', status: 'Ativo', subscriptionPlan: 'Gratuito', joinedAt: '01/06/2026' },
  { name: 'Diego Fernandes', email: 'diego@exemplo.com', role: 'admin', status: 'Ativo', subscriptionPlan: 'Premium', joinedAt: '01/12/2025' },
];

export const getUserByName = (name: string) => MOCK_USERS.find((u) => u.name === name);
