import { supabase } from '@/integrations/supabase/client';
import type { MockCoupon } from '@/modules/admin/types/coupon.types';
import type { IntegrationStatus } from '@/modules/admin/types/integration.types';
import type { MockUser } from '@/modules/admin/types/user.types';
import { env } from '@/app/config/env';

interface PlatformOrder {
  id: string;
  status: string;
  amount_cents: number;
  created_at: string;
  paid_at: string | null;
}

const formatDate = (value: string) => new Intl.DateTimeFormat('pt-BR').format(new Date(value));
const relativeTime = (value: string) => {
  const hours = Math.floor((Date.now() - Date.parse(value)) / 3_600_000);
  return hours < 1 ? 'agora' : hours < 24 ? `há ${hours}h` : `há ${Math.floor(hours / 24)} dias`;
};

const listAllOrders = async (): Promise<PlatformOrder[]> => {
  const [courses, beats, products] = await Promise.all([
    supabase.from('course_orders').select('id,status,amount_cents,created_at,paid_at').order('created_at', { ascending: false }).limit(500),
    supabase.from('beat_orders').select('id,status,amount_cents,created_at,paid_at').order('created_at', { ascending: false }).limit(500),
    supabase.from('digital_product_orders').select('id,status,amount_cents,created_at,paid_at').order('created_at', { ascending: false }).limit(500),
  ]);
  const failure = courses.error ?? beats.error ?? products.error;
  if (failure) throw new Error(failure.message);
  return [...(courses.data ?? []), ...(beats.data ?? []), ...(products.data ?? [])] as PlatformOrder[];
};

export const adminService = {
  async getDashboardStats() {
    const { count: users, error } = await supabase.from('user_profiles').select('user_id', { count: 'exact', head: true });
    if (error) throw new Error(error.message);
    const all = await listAllOrders();
    const paid = all.filter((order) => order.status === 'paid');
    const since = Date.now() - 30 * 86_400_000;
    const recent = paid.filter((order) => Date.parse(order.paid_at ?? order.created_at) >= since);
    return {
      activeUsers: users ?? 0,
      activeUsersDeltaPct: 0,
      salesLast30Days: recent.reduce((sum, order) => sum + order.amount_cents, 0),
      salesDeltaPct: 0,
      orders: recent.length,
      ordersDeltaPct: 0,
      conversionRatePct: all.length ? Number(((paid.length / all.length) * 100).toFixed(2)) : 0,
      conversionDeltaPct: 0,
    };
  },

  async getSalesSeries() {
    const all = (await listAllOrders()).filter((order) => order.status === 'paid');
    const totals = new Map<string, number>();
    all.forEach((order) => {
      const date = formatDate(order.paid_at ?? order.created_at);
      totals.set(date, (totals.get(date) ?? 0) + order.amount_cents);
    });
    return [...totals].slice(-30).map(([date, sales]) => ({ date, sales }));
  },

  async getStudentsSeries() {
    const { data, error } = await supabase.from('user_profiles').select('created_at').eq('role', 'student').order('created_at');
    if (error) throw new Error(error.message);
    let total = 0;
    return (data ?? []).map((profile) => ({ date: formatDate(profile.created_at), students: ++total })).slice(-30);
  },

  async getTopProducts() {
    const { data, error } = await supabase.from('seller_products').select('title,digital_product_order_items(id)').limit(10);
    if (error) throw new Error(error.message);
    return (data ?? [])
      .map((product, index) => ({ rank: index + 1, title: product.title, sales: product.digital_product_order_items?.length ?? 0 }))
      .sort((left, right) => right.sales - left.sales);
  },

  async getRecentSales() {
    const all = (await listAllOrders())
      .filter((order) => order.status === 'paid')
      .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))
      .slice(0, 10);
    return all.map((order) => ({
      customer: order.id.slice(0, 8),
      item: 'Pedido da plataforma',
      amountCents: order.amount_cents,
      time: relativeTime(order.created_at),
    }));
  },

  async getAlerts() {
    const { count } = await supabase.from('contact_messages').select('id', { count: 'exact', head: true }).eq('status', 'new');
    return count ? [{ title: `${count} mensagens de suporte abertas`, severity: 'alta' as const }] : [];
  },

  async getRecentActivity() {
    const logs = await this.listAuditLogs();
    return logs.slice(0, 10).map((log) => ({ actor: log.user, action: log.action, time: log.date }));
  },

  async getUpcomingEvents() {
    return [];
  },

  async listUsers(): Promise<MockUser[]> {
    const { data, error } = await supabase.from('user_profiles').select('full_name,role,created_at').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((profile) => ({
      name: profile.full_name ?? 'Usuário',
      email: 'E-mail protegido',
      role: profile.role,
      status: 'Ativo',
      subscriptionPlan: 'Gratuito',
      joinedAt: formatDate(profile.created_at),
    }));
  },

  async listStudents() {
    return (await this.listUsers()).filter((user) => user.role === 'student');
  },

  async listCoupons(): Promise<MockCoupon[]> {
    const { data, error } = await supabase
      .from('discount_coupons')
      .select('code,discount_type,discount_value,ends_at,usage_limit,active,coupon_redemptions(id)')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((coupon) => ({
      code: coupon.code,
      discountLabel: coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `R$ ${(coupon.discount_value / 100).toFixed(2)}`,
      validUntil: coupon.ends_at ? formatDate(coupon.ends_at) : 'Sem prazo',
      maxUses: coupon.usage_limit ?? 0,
      used: coupon.coupon_redemptions?.length ?? 0,
      status: coupon.active && (!coupon.ends_at || Date.parse(coupon.ends_at) > Date.now()) ? 'ativo' : 'expirado',
    }));
  },

  async listIntegrations(): Promise<IntegrationStatus[]> {
    const { data, error } = await supabase.from('platform_integrations').select('display_name,category,status').order('display_name');
    if (error) throw new Error(error.message);
    return (data ?? []).map((integration) => ({
      name: integration.display_name,
      description: integration.category,
      status: integration.status === 'connected' ? 'conectado' : 'desconectado',
    }));
  },

  async toggleIntegration(name: string) {
    const response = await fetch(`${env.supabaseUrl}/rest/v1/rpc/toggle_demo_integration`, {
      method: 'POST',
      headers: {
        apikey: env.supabasePublishableKey,
        Authorization: `Bearer ${env.supabasePublishableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ integration_name: name }),
    });
    if (!response.ok) throw new Error(await response.text());
    return { success: true as const };
  },

  async getFinanceSummary() {
    const paid = (await listAllOrders()).filter((order) => order.status === 'paid');
    return {
      balanceCents: paid.reduce((sum, order) => sum + order.amount_cents, 0),
      pendingPayoutCents: 0,
      nextPayoutDate: 'Não agendado',
      taxesDueCents: 0,
    };
  },

  async listTransactions() {
    const paid = (await listAllOrders()).filter((order) => order.status === 'paid');
    return paid.map((order) => ({
      id: order.id.slice(0, 8),
      description: 'Venda da plataforma',
      amountCents: order.amount_cents,
      type: 'entrada' as const,
      date: formatDate(order.paid_at ?? order.created_at),
    }));
  },

  async listInvoices() {
    return [];
  },

  async listCampaigns() {
    const { data, error } = await supabase.from('marketing_campaigns').select('name,channel,status').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((campaign) => ({
      name: campaign.name,
      channel: campaign.channel,
      status: campaign.status === 'active' ? 'ativa' as const : 'agendada' as const,
      leads: 0,
      conversionPct: 0,
    }));
  },

  async listLeads() {
    const { data, error } = await supabase.from('marketing_leads').select('name,email,source,created_at').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((lead) => ({
      name: lead.name ?? 'Lead',
      email: lead.email,
      source: lead.source,
      createdAt: formatDate(lead.created_at),
    }));
  },

  async listLandingPages() {
    const { data, error } = await supabase.from('cms_documents').select('title,status').eq('document_type', 'landing_page').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((document) => ({
      name: document.title,
      visits: 0,
      conversionPct: 0,
      status: document.status === 'published' ? 'publicada' as const : 'rascunho' as const,
    }));
  },

  async listAuditLogs() {
    const { data, error } = await supabase
      .from('admin_audit_logs')
      .select('actor_name_snapshot,action,entity_type,created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []).map((log) => ({
      user: log.actor_name_snapshot,
      action: `${log.action} · ${log.entity_type}`,
      date: formatDate(log.created_at),
      severity: 'info' as const,
    }));
  },

  async listAccessSessions() {
    return [];
  },

  async listRoles() {
    return [
      { role: 'student', description: 'Área do aluno' },
      { role: 'instructor', description: 'Cursos e alunos' },
      { role: 'producer', description: 'Produtos e beats' },
      { role: 'affiliate', description: 'Links, conversões e comissões' },
      { role: 'admin', description: 'Painel administrativo' },
      { role: 'super_admin', description: 'Administração e segurança' },
    ];
  },

  async revokeSession(_sessionId?: string) {
    throw new Error('A revogação de sessões exige autenticação administrativa ativa.');
  },

  async getSubscriptionSummary() {
    return { activeSubscribers: 0, mrrCents: 0, churnRatePct: 0, trialUsers: 0 };
  },

  async listSubscriptionPlans() {
    return [];
  },

  async listSubscriptions() {
    return [];
  },
};
