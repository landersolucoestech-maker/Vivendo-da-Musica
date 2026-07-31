import { Activity, AlertTriangle, BarChart3, ShoppingBag, Users, WalletCards } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import AdminLayout from '@/app/layouts/AdminLayout';
import {
  useAdminAlerts,
  useAdminDashboardStats,
  useAdminRecentActivity,
  useAdminRecentSales,
  useAdminSalesSeries,
  useAdminTopProducts,
} from '@/modules/admin/hooks/useAdminDashboard';
import StatCard from '@/shared/components/StatCard';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { formatPrice as formatCurrency } from '@/shared/utils/formatters';

const AdminDashboard = () => {
  const { data: stats } = useAdminDashboardStats();
  const { data: salesSeries } = useAdminSalesSeries();
  const { data: topProducts } = useAdminTopProducts();
  const { data: recentSales } = useAdminRecentSales();
  const { data: alerts } = useAdminAlerts();
  const { data: recentActivity } = useAdminRecentActivity();

  const statCards = stats
    ? [
        { label: 'Usuários ativos', value: stats.activeUsers.toLocaleString('pt-BR'), delta: `+${stats.activeUsersDeltaPct}% no mês`, icon: Users },
        { label: 'Faturamento', value: formatCurrency(stats.salesLast30Days), delta: `+${stats.salesDeltaPct}% no mês`, icon: WalletCards },
        { label: 'Pedidos', value: stats.orders.toLocaleString('pt-BR'), delta: `+${stats.ordersDeltaPct}% no mês`, icon: ShoppingBag },
        { label: 'Conversão', value: `${stats.conversionRatePct}%`, delta: `+${stats.conversionDeltaPct} p.p.`, icon: BarChart3 },
      ]
    : [];

  return (
    <AdminLayout>
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="vdm-eyebrow">Administração</p>
          <h1 className="vdm-page-title mt-2">Visão geral da plataforma</h1>
          <p className="vdm-page-description">Indicadores operacionais, comerciais e de atividade dos últimos 30 dias.</p>
        </div>
        <Badge variant="outline" className="w-fit px-3 py-1">Últimos 30 dias</Badge>
      </header>

      {!!alerts?.length && (
        <section className="mb-6 space-y-2" aria-label="Alertas administrativos">
          {alerts.map((alert) => (
            <div key={alert.title} className="flex items-center gap-3 rounded-lg border border-amber-500/25 bg-amber-500/8 px-4 py-3 text-sm text-amber-300">
              <AlertTriangle className="size-4 shrink-0" />
              {alert.title}
            </div>
          ))}
        </section>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </div>

      <div className="mb-8 grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <p className="vdm-eyebrow">Comercial</p>
              <CardTitle className="mt-1 text-xl">Vendas nos últimos 30 dias</CardTitle>
            </div>
            <span className="vdm-icon-button border-primary/25 bg-primary/10 text-primary"><BarChart3 className="size-5" /></span>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={salesSeries ?? []}>
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#151515', border: '1px solid #333', borderRadius: 12 }} />
                <Line type="monotone" dataKey="sales" stroke="#8A2BE2" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: '#6C3AED' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="vdm-eyebrow">Desempenho</p>
            <CardTitle className="mt-1 text-xl">Produtos mais vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {(topProducts ?? []).map((product) => (
                <li key={product.rank} className="flex items-center justify-between gap-4 border-b border-white/8 pb-4 last:border-0 last:pb-0">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-bold text-primary">{product.rank}</span>
                    <span className="truncate text-sm font-medium text-white">{product.title}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{product.sales} vendas</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div><p className="vdm-eyebrow">Pedidos</p><CardTitle className="mt-1 text-xl">Vendas recentes</CardTitle></div>
            <ShoppingBag className="size-5 text-primary" />
          </CardHeader>
          <CardContent className="space-y-4">
            {(recentSales ?? []).map((sale) => (
              <div key={`${sale.customer}-${sale.time}`} className="flex items-center justify-between gap-4 border-b border-white/8 pb-4 last:border-0 last:pb-0">
                <div><p className="text-sm font-semibold text-white">{sale.customer}</p><p className="mt-1 text-xs text-muted-foreground">{sale.item}</p></div>
                <span className="text-xs text-muted-foreground">{sale.time}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div><p className="vdm-eyebrow">Operação</p><CardTitle className="mt-1 text-xl">Atividades recentes</CardTitle></div>
            <Activity className="size-5 text-primary" />
          </CardHeader>
          <CardContent className="space-y-4">
            {(recentActivity ?? []).map((activity) => (
              <div key={`${activity.actor}-${activity.time}`} className="border-b border-white/8 pb-4 last:border-0 last:pb-0">
                <p className="text-sm text-[#d4d4d4]"><span className="font-semibold text-white">{activity.actor}</span> {activity.action}</p>
                <p className="mt-1 text-xs text-muted-foreground">{activity.time}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
