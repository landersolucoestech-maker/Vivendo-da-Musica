import { supabase } from '@/integrations/supabase/client';
import type { MockCoupon } from '@/modules/admin/types/coupon.types';
import type { IntegrationStatus } from '@/modules/admin/types/integration.types';
import type { MockUser } from '@/modules/admin/types/user.types';

interface OrderRecord {
  id: string;
  status: string;
  amount_cents: number;
  created_at: string;
  paid_at: string | null;
  title: string;
}

interface UserProfileRow {
  user_id: string;
  full_name: string | null;
  role: MockUser['role'];
  created_at: string;
}

const formatDate = (value: string) => new Intl.DateTimeFormat('pt-BR').format(new Date(value));
const timeAgo = (value: string) => {
  const hours = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 3_600_000));
  if (hours < 1) return 'agora';
  if (hours < 24) return `há ${hours} h`;
  return `há ${Math.floor(hours / 24)} dias`;
};

const listOrderRecords = async (): Promise<OrderRecord[]> => {
  const [beatResult, productResult] = await Promise.all([
    supabase
      .from('beat_order_items')
      .select('id,status,amount_cents,created_at,paid_at,beat_title_snapshot')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('digital_product_order_items')
      .select('id,status,amount_cents,created_at,paid_at,product_title_snapshot')
      .order('created_at', { ascending: false })
      .limit(500),
  ]);
  if (beatResult.error) throw new Error(beatResult.error.message);
  if (productResult.error) throw new Error(productResult.error.message);

  return [
    ...(beatResult.data ?? []).map((row) => ({
      id: row.id,
      status: row.status,
      amount_cents: row.amount_cents,
      created_at: row.created_at,
      paid_at: row.paid_at,
      title: row.beat_title_snapshot,
    })),
    ...(productResult.data ?? []).map((row) => ({
      id: row.id,
      status: row.status,
      amount_cents: row.amount_cents,
      created_at: row.created_at,
      paid_at: row.paid_at,
      title: row.product_title_snapshot,
    })),
  ].sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at));
};

export const adminService = {
  async getDashboardStats() {
    const { count: users, error } = await supabase.from('user_profiles').select('user_id', { count: 'exact', head: true });
    if (error) throw new Error(error.message);
    const orders = await listOrderRecords();
    const paid = orders.filter((order) => order.status === 'paid');
    const since = Date.now() - 30 * 86_400_000;
    const recent = paid.filter((order) => Date.parse(order.paid_at ?? order.created_at) >= since);
    return {
      activeUsers: users ?? 0,
      activeUsersDeltaPct: 0,
      salesLast30Days: recent.reduce((total, order) => total + order.amount_cents, 0),
      salesDeltaPct: 0,
      orders: recent.length,
      ordersDeltaPct: 0,
      conversionRatePct: orders.length ? Number(((paid.length / orders.length) * 100).toFixed(2)) : 0,
      conversionDeltaPct: 0,
    };
  },

  async getSalesSeries() {
    const paid = (await listOrderRecords()).filter((order) => order.status === 'paid');
    const values = new Map<string, number>();
    paid.forEach((order) => {
      const date = formatDate(order.paid_at ?? order.created_at);
      values.set(date, (values.get(date) ?? 0) + order.amount_cents);
    });
    return [...values].slice(-30).map(([date, sales]) => ({ date, sales }));
  },

  async getStudentsSeries() {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('created_at')
      .eq('role', 'student')
      .order('created_at');
    if (error) throw new Error(error.message);
    let total = 0;
    return (data ?? []).map((row) => ({ date: formatDate(row.created_at), students: ++total })).slice(-30);
  },

  async getTopProducts() {
    const { data, error } = await supabase
      .from('seller_products')
      .select('id,title,digital_product_order_items(id,status)')
      .order('published_at', { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return (data ?? [])
      .map((row) => ({
        rank: 0,
        title: row.title,
        sales: (row.digital_product_order_items ?? []).filter((item) => item.status === 'paid').length,
      }))
      .sort((left, right) => right.sales - left.sales)
      .slice(0, 10)
      .map((item, index) => ({ ...item, rank: index + 1 }));
  },

  async getRecentSales() {
    return (await listOrderRecords())
      .filter((order) => order.status === 'paid')
      .slice(0, 10)
      .map((order) => ({
        customer: `Pedido ${order.id.slice(0, 8)}`,
        item: order.title,
        amountCents: order.amount_cents,
        time: timeAgo(order.paid_at ?? order.created_at),
      }));
  },

  async getAlerts() {
    const { count, error } = await supabase
      .from('contact_messages')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new');
    if (error) throw new Error(error.message);
    return count ? [{ title: `${count} mensagens aguardando atendimento`, severity: 'alta' as const }] : [];
  },

  async getRecentActivity() {
    const logs = await this.listAuditLogs();
    return logs.slice(0, 10).map((log) => ({ actor: log.user, action: log.action, time: log.date }));
  },

  async getUpcomingEvents() {
    return [];
  },

  async listUsers(): Promise<MockUser[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id,full_name,role,created_at')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as UserProfileRow[]).map((row) => ({
      name: row.full_name ?? 'Usuário sem nome informado',
      email: 'Não disponível',
      role: row.role,
      status: 'Ativo',
      subscriptionPlan: 'Gratuito',
      joinedAt: formatDate(row.created_at),
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
      discountLabel: coupon.discount_type === 'percentage'
        ? `${coupon.discount_value}%`
        : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(coupon.discount_value / 100),
      validUntil: coupon.ends_at ? formatDate(coupon.ends_at) : 'Sem prazo',
      maxUses: coupon.usage_limit ?? 0,
      used: coupon.coupon_redemptions?.length ?? 0,
      status: coupon.active && (!coupon.ends_at || Date.parse(coupon.ends_at) > Date.now()) ? 'ativo' : 'expirado',
    }));
  },

  async listIntegrations(): Promise<IntegrationStatus[]> {
    const { data, error } = await supabase
      .from('platform_integrations')
      .select('display_name,category,status')
      .order('display_name');
    if (error) throw new Error(error.message);
    return (data ?? []).map((integration) => ({
      name: integration.display_name,
      description: integration.category,
      status: integration.status === 'connected' ? 'conectado' : 'desconectado',
    }));
  },

  async toggleIntegration(name: string) {
    const { error } = await supabase.rpc('toggle_demo_integration', { integration_name: name });
    if (error) throw new Error(error.message);
    return { success: true as const };
  },

  async getFinanceSummary() {
    const paid = (await listOrderRecords()).filter((order) => order.status === 'paid');
    const { data: accounts, error } = await supabase
      .from('producer_financial_accounts')
      .select('eligible_balance_cents');
    if (error) throw new Error(error.message);
    return {
      balanceCents: paid.reduce((total, order) => total + order.amount_cents, 0),
      pendingPayoutCents: (accounts ?? []).reduce((total, account) => total + Number(account.eligible_balance_cents), 0),
      nextPayoutDate: 'Não agendado',
      taxesDueCents: 0,
    };
  },

  async listTransactions() {
    return (await listOrderRecords()).map((order) => ({
      id: order.id.slice(0, 8),
      description: order.title,
      amountCents: order.amount_cents,
      type: 'entrada' as const,
      date: formatDate(order.paid_at ?? order.created_at),
    }));
  },

  async listInvoices() {
    return [];
  },

  async listCampaigns() {
    const { data, error } = await supabase
      .from('marketing_campaigns')
      .select('id,name,channel,status,marketing_leads(id)')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((campaign) => ({
      name: campaign.name,
      channel: campaign.channel,
      status: campaign.status === 'active' ? 'ativa' as const : 'agendada' as const,
      leads: campaign.marketing_leads?.length ?? 0,
      conversionPct: 0,
    }));
  },

  async listLeads() {
    const { data, error } = await supabase
      .from('marketing_leads')
      .select('name,email,source,created_at')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((lead) => ({
      name: lead.name ?? 'Lead sem nome informado',
      email: lead.email,
      source: lead.source,
      createdAt: formatDate(lead.created_at),
    }));
  },

  async listLandingPages() {
    const { data, error } = await supabase
      .from('cms_documents')
      .select('title,status')
      .eq('document_type', 'landing_page')
      .order('created_at', { ascending: false });
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

  async revokeSession() {
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
