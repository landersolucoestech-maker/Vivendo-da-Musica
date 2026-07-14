import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Download } from "lucide-react";
import AdminLayout from "@/app/layouts/AdminLayout";
import PageHeader from "@/shared/components/PageHeader";
import StatCard from "@/shared/components/StatCard";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/hooks/use-toast";
import {
  useAdminDashboardStats, useAdminSalesSeries, useAdminStudentsSeries, useAdminTopProducts,
} from "@/modules/admin/hooks/useAdminDashboard";
import { formatPrice as formatCurrency } from "@/shared/utils/formatters";

const AdminReportsPage = () => {
  const { toast } = useToast();
  const { data: stats } = useAdminDashboardStats();
  const { data: salesSeries } = useAdminSalesSeries();
  const { data: studentsSeries } = useAdminStudentsSeries();
  const { data: topProducts } = useAdminTopProducts();

  return (
    <AdminLayout>
      <PageHeader
        title="Relatórios"
        subtitle="Receita, vendas, alunos, cursos, produtos e eventos."
        actions={
          <Button variant="outline" className="border-border" onClick={() => toast({ title: "Exportação gerada", description: "Relatório enviado para o seu e-mail." })}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        }
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Faturamento (30 dias)" value={formatCurrency(stats?.salesLast30Days ?? 0)} />
        <StatCard label="Pedidos (30 dias)" value={(stats?.orders ?? 0).toLocaleString('pt-BR')} />
        <StatCard label="Alunos ativos" value={(stats?.activeUsers ?? 0).toLocaleString('pt-BR')} />
        <StatCard label="Taxa de conversão" value={`${stats?.conversionRatePct ?? 0}%`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-muted-foreground mb-4">Receita</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={salesSeries ?? []}>
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
              <Line type="monotone" dataKey="sales" stroke="#8B5CF6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-muted-foreground mb-4">Crescimento de alunos</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={studentsSeries ?? []}>
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
              <Line type="monotone" dataKey="students" stroke="#22D3EE" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-muted-foreground mb-4">Cursos e produtos mais vendidos</h2>
        <ol className="space-y-3">
          {(topProducts ?? []).map((product) => (
            <li key={product.rank} className="flex items-center justify-between text-sm">
              <span>{product.rank}. {product.title}</span>
              <span className="text-muted-foreground">{product.sales} vendas</span>
            </li>
          ))}
        </ol>
      </div>
    </AdminLayout>
  );
};

export default AdminReportsPage;
