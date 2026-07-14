import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { AlertTriangle } from "lucide-react";
import AdminLayout from "@/app/layouts/AdminLayout";
import PageHeader from "@/shared/components/PageHeader";
import StatCard from "@/shared/components/StatCard";
import {
  useAdminDashboardStats, useAdminSalesSeries, useAdminTopProducts,
  useAdminRecentSales, useAdminAlerts, useAdminRecentActivity, useAdminUpcomingEvents,
} from "@/modules/admin/hooks/useAdminDashboard";
import { formatPrice as formatCurrency } from "@/shared/utils/formatters";

const AdminDashboard = () => {
  const { data: stats } = useAdminDashboardStats();
  const { data: salesSeries } = useAdminSalesSeries();
  const { data: topProducts } = useAdminTopProducts();
  const { data: recentSales } = useAdminRecentSales();
  const { data: alerts } = useAdminAlerts();
  const { data: recentActivity } = useAdminRecentActivity();
  const { data: upcomingEvents } = useAdminUpcomingEvents();

  const statCards = stats ? [
    { label: 'Usuários ativos', value: stats.activeUsers.toLocaleString('pt-BR'), delta: `+${stats.activeUsersDeltaPct}% este mês` },
    { label: 'Vendas (mês)', value: formatCurrency(stats.salesLast30Days), delta: `+${stats.salesDeltaPct}% este mês` },
    { label: 'Pedidos', value: stats.orders.toLocaleString('pt-BR'), delta: `+${stats.ordersDeltaPct}% este mês` },
    { label: 'Taxa de conversão', value: `${stats.conversionRatePct}%`, delta: `+${stats.conversionDeltaPct}pp este mês` },
  ] : [];

  return (
    <AdminLayout>
      <PageHeader title="Dashboard" subtitle="Visão geral da plataforma." actions={<span className="text-sm text-muted-foreground">Últimos 30 dias</span>} />

      {!!alerts?.length && (
        <div className="space-y-2 mb-6">
          {alerts.map((alert) => (
            <div key={alert.title} className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {alert.title}
            </div>
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </div>

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6 mb-6">
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-muted-foreground mb-4">Vendas nos últimos 30 dias</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={salesSeries ?? []}>
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
              />
              <Line type="monotone" dataKey="sales" stroke="#8B5CF6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-muted-foreground mb-4">Produtos mais vendidos</h2>
          <ol className="space-y-3">
            {(topProducts ?? []).map((product) => (
              <li key={product.rank} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground">{product.rank}.</span>
                  {product.title}
                </span>
                <span className="text-muted-foreground">{product.sales} vendas</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-muted-foreground mb-4">Vendas recentes</h2>
          <div className="space-y-3">
            {(recentSales ?? []).map((sale) => (
              <div key={`${sale.customer}-${sale.time}`} className="text-sm">
                <p className="font-medium">{sale.customer}</p>
                <p className="text-muted-foreground">{sale.item} · {sale.time}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-muted-foreground mb-4">Atividades recentes</h2>
          <div className="space-y-3">
            {(recentActivity ?? []).map((activity) => (
              <div key={`${activity.actor}-${activity.time}`} className="text-sm">
                <p><span className="font-medium">{activity.actor}</span> {activity.action}</p>
                <p className="text-muted-foreground text-xs">{activity.time}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-muted-foreground mb-4">Próximos eventos</h2>
          <div className="space-y-3">
            {(upcomingEvents ?? []).map((event) => (
              <div key={event.title} className="text-sm">
                <p className="font-medium">{event.title}</p>
                <p className="text-muted-foreground">{event.date} · {event.attendees} inscritos</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
