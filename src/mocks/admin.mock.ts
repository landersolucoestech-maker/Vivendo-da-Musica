/**
 * Centralized admin mock data. TODO(backend): replace with real aggregate
 * queries once orders, payments and the relevant tables exist. Shaped like
 * the eventual API response so the dashboard/report components don't need
 * to change when that lands.
 */
export const MOCK_ADMIN_STATS = {
  activeUsers: 8523,
  activeUsersDeltaPct: 12,
  salesLast30Days: 12543000, // cents
  salesDeltaPct: 18,
  orders: 2341,
  ordersDeltaPct: 9,
  conversionRatePct: 3.42,
  conversionDeltaPct: 0.8,
};

export const MOCK_SALES_SERIES = [
  { date: '01/05', sales: 3200 },
  { date: '08/05', sales: 4600 },
  { date: '15/05', sales: 3900 },
  { date: '22/05', sales: 6100 },
  { date: '29/05', sales: 5400 },
  { date: '05/06', sales: 7200 },
  { date: '12/06', sales: 8523 },
];

export const MOCK_STUDENTS_SERIES = [
  { date: '01/05', students: 6200 },
  { date: '08/05', students: 6650 },
  { date: '15/05', students: 7100 },
  { date: '22/05', students: 7480 },
  { date: '29/05', students: 7900 },
  { date: '05/06', students: 8210 },
  { date: '12/06', students: 8523 },
];

export const MOCK_TOP_PRODUCTS = [
  { rank: 1, title: 'Curso Produção Musical', sales: 1234 },
  { rank: 2, title: 'Sample Pack Trap Essentials', sales: 962 },
  { rank: 3, title: 'Curso Mixagem Passo a Passo', sales: 754 },
  { rank: 4, title: 'Drum Kit Drill Vol.1', sales: 620 },
];

export const MOCK_RECENT_SALES = [
  { customer: 'Ana Oliveira', item: 'Produção Musical — Do Zero ao Profissional', amountCents: 29700, time: 'há 12 min' },
  { customer: 'Lucas Beats', item: 'Trap Essentials Sample Pack', amountCents: 4990, time: 'há 47 min' },
  { customer: 'João Millen', item: 'Drill Drum Kit Vol.1', amountCents: 3990, time: 'há 2h' },
];

export const MOCK_ADMIN_ALERTS = [
  { title: '3 tickets de suporte abertos há mais de 24h', severity: 'alta' as const },
  { title: 'Cupom BLACKFRIDAY expira em 5 dias', severity: 'média' as const },
];

export const MOCK_RECENT_ACTIVITY = [
  { actor: 'João Millen', action: 'publicou o curso "Mixagem Passo a Passo"', time: 'há 1h' },
  { actor: 'Ana Oliveira', action: 'concluiu o curso "Produção Musical"', time: 'há 3h' },
  { actor: 'Admin', action: 'criou o cupom BLACKFRIDAY', time: 'há 1 dia' },
];

export const MOCK_UPCOMING_EVENTS_ADMIN = [
  { title: 'Workshop de Mixagem com Fab Dupont', date: '01/06/2026', attendees: 128 },
  { title: 'Masterclass Produção com João Millen', date: '22/06/2026', attendees: 94 },
];

import type { IntegrationStatus } from "@/modules/admin/types/integration.types";

export const MOCK_INTEGRATIONS: IntegrationStatus[] = [
  { name: 'Stripe', description: 'Pagamentos e assinaturas', status: 'desconectado' },
  { name: 'Supabase', description: 'Banco de dados e autenticação', status: 'conectado' },
  { name: 'Resend', description: 'Envio de e-mails transacionais', status: 'desconectado' },
  { name: 'Storage', description: 'Armazenamento de arquivos de aulas e produtos', status: 'conectado' },
  { name: 'Sentry', description: 'Monitoramento de erros', status: 'desconectado' },
];

export const MOCK_FINANCE = {
  balanceCents: 4582000,
  pendingPayoutCents: 1230000,
  nextPayoutDate: '01/07/2026',
  taxesDueCents: 312000,
};

export const MOCK_TRANSACTIONS = [
  { id: '#TX-991', description: 'Venda — Produção Musical', amountCents: 29700, type: 'entrada' as const, date: '10/06/2026' },
  { id: '#TX-990', description: 'Repasse para instrutor João Millen', amountCents: -890000, type: 'saida' as const, date: '05/06/2026' },
  { id: '#TX-989', description: 'Venda — Trap Essentials Sample Pack', amountCents: 4990, type: 'entrada' as const, date: '04/06/2026' },
];

export const MOCK_INVOICES = [
  { id: 'NF-0231', amountCents: 29700, status: 'emitida' as const, date: '10/06/2026' },
  { id: 'NF-0230', amountCents: 4990, status: 'pendente' as const, date: '09/06/2026' },
];

export const MOCK_CAMPAIGNS = [
  { name: 'Lançamento Curso de Mixagem', channel: 'E-mail', status: 'ativa' as const, leads: 842, conversionPct: 4.2 },
  { name: 'Black Friday 2026', channel: 'Instagram Ads', status: 'agendada' as const, leads: 0, conversionPct: 0 },
];

export const MOCK_LEADS = [
  { name: 'Pedro Santos', email: 'pedro@exemplo.com', source: 'Landing Page', createdAt: '08/06/2026' },
  { name: 'Carla Mendes', email: 'carla@exemplo.com', source: 'Instagram Ads', createdAt: '07/06/2026' },
];

export const MOCK_LANDING_PAGES = [
  { name: 'Curso de Mixagem — Lançamento', visits: 4820, conversionPct: 3.1, status: 'publicada' as const },
  { name: 'Black Friday 2026', visits: 0, conversionPct: 0, status: 'rascunho' as const },
];

export const MOCK_AUDIT_LOGS = [
  { user: 'admin@vivendodamusica.com', action: 'Atualizou status do pedido #1040', date: '10/06/2026 14:22', severity: 'info' as const },
  { user: 'joao@exemplo.com', action: 'Publicou curso "Mixagem Passo a Passo"', date: '09/06/2026 10:05', severity: 'info' as const },
  { user: 'desconhecido', action: 'Tentativa de login falhou 5x para admin@vivendodamusica.com', date: '08/06/2026 23:47', severity: 'alerta' as const },
];

export const MOCK_ACCESS_SESSIONS = [
  { device: 'Chrome — Windows', location: 'São Paulo, BR', lastActive: 'agora', current: true },
  { device: 'Safari — iPhone', location: 'São Paulo, BR', lastActive: 'há 2 dias', current: false },
];

export const MOCK_SUBSCRIPTION_SUMMARY = {
  activeSubscribers: 3214,
  mrrCents: 16040000,
  churnRatePct: 2.1,
  trialUsers: 184,
};

export const MOCK_SUBSCRIPTION_PLANS = [
  { name: 'Premium Mensal', subscribers: 1842, priceCents: 4990 },
  { name: 'Premium Anual', subscribers: 1372, priceCents: 3990 },
];

export const MOCK_SUBSCRIPTIONS_LIST = [
  { customer: 'Ana Oliveira', plan: 'Premium Anual', status: 'ativa' as const, renewsAt: '12/03/2027' },
  { customer: 'Lucas Beats', plan: 'Premium Mensal', status: 'ativa' as const, renewsAt: '14/07/2026' },
  { customer: 'Carla Mendes', plan: 'Premium Mensal', status: 'ativa' as const, renewsAt: '18/07/2026' },
  { customer: 'Mariana Santos', plan: 'Premium Mensal', status: 'cancelada' as const, renewsAt: '—' },
];

export const MOCK_ROLES = [
  { role: 'student', description: 'Acesso aos cursos matriculados e área do aluno' },
  { role: 'instructor', description: 'Gerencia os próprios cursos e visualiza matrículas' },
  { role: 'admin', description: 'Acesso total ao painel administrativo' },
  { role: 'super_admin', description: 'Acesso total + configurações de segurança' },
];
