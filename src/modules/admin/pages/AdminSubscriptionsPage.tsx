import AdminLayout from "@/app/layouts/AdminLayout";
import PageHeader from "@/shared/components/PageHeader";
import StatCard from "@/shared/components/StatCard";
import DataTable from "@/shared/components/DataTable";
import StatusBadge from "@/shared/components/StatusBadge";
import {
  useAdminSubscriptionSummary, useAdminSubscriptionPlans, useAdminSubscriptions,
} from "@/modules/admin/hooks/useAdminSubscriptions";
import { formatPrice } from "@/shared/utils/formatters";

const AdminSubscriptionsPage = () => {
  const { data: summary } = useAdminSubscriptionSummary();
  const { data: plans } = useAdminSubscriptionPlans();
  const { data: subscriptions } = useAdminSubscriptions();

  return (
    <AdminLayout>
      <PageHeader title="Assinaturas" subtitle="Planos Premium, receita recorrente e churn." />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Assinantes ativos" value={(summary?.activeSubscribers ?? 0).toLocaleString('pt-BR')} />
        <StatCard label="MRR" value={formatPrice(summary?.mrrCents ?? 0)} />
        <StatCard label="Churn mensal" value={`${summary?.churnRatePct ?? 0}%`} />
        <StatCard label="Em teste" value={String(summary?.trialUsers ?? 0)} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {(plans ?? []).map((plan) => (
          <div key={plan.name} className="rounded-lg border border-border bg-card p-5">
            <p className="font-semibold mb-1">{plan.name}</p>
            <p className="text-2xl font-bold mb-1">{plan.subscribers.toLocaleString('pt-BR')} <span className="text-sm text-muted-foreground font-normal">assinantes</span></p>
            <p className="text-sm text-muted-foreground">{formatPrice(plan.priceCents)}/mês</p>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-semibold text-muted-foreground mb-3">Assinaturas recentes</h2>
      <DataTable
        rows={subscriptions ?? []}
        rowKey={(sub) => sub.customer}
        emptyLabel="Nenhuma assinatura registrada ainda."
        columns={[
          { header: 'Cliente', cell: (sub) => sub.customer },
          { header: 'Plano', cell: (sub) => sub.plan },
          { header: 'Renovação', cell: (sub) => sub.renewsAt },
          { header: 'Status', cell: (sub) => <StatusBadge status={sub.status} label={sub.status === 'ativa' ? 'Ativa' : 'Cancelada'} /> },
        ]}
      />
    </AdminLayout>
  );
};

export default AdminSubscriptionsPage;
