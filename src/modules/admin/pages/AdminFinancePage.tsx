import AdminLayout from "@/app/layouts/AdminLayout";
import PageHeader from "@/shared/components/PageHeader";
import StatCard from "@/shared/components/StatCard";
import DataTable from "@/shared/components/DataTable";
import StatusBadge from "@/shared/components/StatusBadge";
import { Wallet, Clock, Receipt, Percent } from "lucide-react";
import { useAdminFinanceSummary, useAdminTransactions, useAdminInvoices } from "@/modules/admin/hooks/useAdminFinance";
import { formatPrice } from "@/shared/utils/formatters";

const AdminFinancePage = () => {
  const { data: finance } = useAdminFinanceSummary();
  const { data: transactions } = useAdminTransactions();
  const { data: invoices } = useAdminInvoices();

  return (
    <AdminLayout>
      <PageHeader title="Financeiro" subtitle="Saldo, repasses, transações e notas fiscais." />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Saldo disponível" value={formatPrice(finance?.balanceCents ?? 0)} icon={Wallet} />
        <StatCard label="Repasse pendente" value={formatPrice(finance?.pendingPayoutCents ?? 0)} delta={`Próximo em ${finance?.nextPayoutDate ?? '—'}`} icon={Clock} />
        <StatCard label="Impostos devidos" value={formatPrice(finance?.taxesDueCents ?? 0)} icon={Percent} />
        <StatCard label="Notas emitidas" value={String(invoices?.length ?? 0)} icon={Receipt} />
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Transações</h2>
          <DataTable
            rows={transactions ?? []}
            rowKey={(tx) => tx.id}
            emptyLabel="Nenhuma transação registrada ainda."
            columns={[
              { header: 'ID', cell: (tx) => tx.id },
              { header: 'Descrição', cell: (tx) => tx.description },
              { header: 'Valor', cell: (tx) => formatPrice(tx.amountCents) },
              { header: 'Data', cell: (tx) => tx.date },
            ]}
          />
        </section>

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Notas fiscais</h2>
          <DataTable
            rows={invoices ?? []}
            rowKey={(invoice) => invoice.id}
            emptyLabel="Nenhuma nota fiscal emitida ainda."
            columns={[
              { header: 'Número', cell: (invoice) => invoice.id },
              { header: 'Valor', cell: (invoice) => formatPrice(invoice.amountCents) },
              { header: 'Status', cell: (invoice) => <StatusBadge status={invoice.status} label={invoice.status} /> },
              { header: 'Data', cell: (invoice) => invoice.date },
            ]}
          />
        </section>
      </div>
    </AdminLayout>
  );
};

export default AdminFinancePage;
