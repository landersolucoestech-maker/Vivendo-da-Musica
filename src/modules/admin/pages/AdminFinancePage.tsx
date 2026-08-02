import { Clock, Percent, Receipt, Wallet } from 'lucide-react';

import AdminLayout from '@/app/layouts/AdminLayout';
import {
  useAdminFinanceSummary,
  useAdminInvoices,
  useAdminProducerPayouts,
  useAdminTransactions,
  useTransitionProducerPayout,
} from '@/modules/admin/hooks/useAdminFinance';
import type { AdminPayoutStatus } from '@/modules/admin/services/admin-finance.service';
import DataTable from '@/shared/components/DataTable';
import PageHeader from '@/shared/components/PageHeader';
import StatCard from '@/shared/components/StatCard';
import StatusBadge from '@/shared/components/StatusBadge';
import { Button } from '@/shared/components/ui/button';
import { useToast } from '@/shared/hooks/use-toast';
import { formatPrice } from '@/shared/utils/formatters';

const payoutStatusLabel: Record<AdminPayoutStatus, string> = {
  requested: 'Solicitado',
  processing: 'Em processamento',
  paid: 'Pago',
  failed: 'Falhou',
  canceled: 'Cancelado',
};

const AdminFinancePage = () => {
  const { data: finance } = useAdminFinanceSummary();
  const { data: transactions } = useAdminTransactions();
  const { data: invoices } = useAdminInvoices();
  const {
    data: payouts,
    isLoading: payoutsLoading,
    isError: payoutsError,
  } = useAdminProducerPayouts();
  const transitionMutation = useTransitionProducerPayout();
  const { toast } = useToast();

  const pendingPayoutCents = (payouts ?? [])
    .filter((payout) => payout.status === 'requested' || payout.status === 'processing')
    .reduce((total, payout) => total + payout.amountCents, 0);

  const transitionPayout = async (
    payoutId: string,
    status: Exclude<AdminPayoutStatus, 'requested'>,
  ) => {
    try {
      await transitionMutation.mutateAsync({ payoutId, status });
      toast({
        title: 'Repasse atualizado',
        description: `Novo status: ${payoutStatusLabel[status]}.`,
      });
    } catch (error) {
      toast({
        title: 'Não foi possível atualizar o repasse',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AdminLayout>
      <PageHeader title="Financeiro" subtitle="Saldo, repasses, transações e notas fiscais." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Receita paga" value={formatPrice(finance?.balanceCents ?? 0)} icon={Wallet} />
        <StatCard label="Repasses em aberto" value={formatPrice(pendingPayoutCents)} icon={Clock} />
        <StatCard label="Impostos devidos" value={formatPrice(finance?.taxesDueCents ?? 0)} icon={Percent} />
        <StatCard label="Notas emitidas" value={String(invoices?.length ?? 0)} icon={Receipt} />
      </div>

      <div className="space-y-8">
        <section>
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground">Repasses de produtores</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Processamento financeiro com transições auditáveis e restituição automática em falha ou cancelamento.
            </p>
          </div>

          {payoutsError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              Não foi possível carregar os repasses. Verifique a sessão administrativa e tente novamente.
            </div>
          ) : (
            <DataTable
              rows={payouts ?? []}
              rowKey={(payout) => payout.id}
              emptyLabel={payoutsLoading ? 'Carregando repasses...' : 'Nenhum repasse solicitado.'}
              columns={[
                { header: 'Produtor', cell: (payout) => payout.producerName },
                { header: 'Destino', cell: (payout) => payout.payoutMethodLabel },
                { header: 'Valor', cell: (payout) => formatPrice(payout.amountCents, payout.currency) },
                {
                  header: 'Status',
                  cell: (payout) => (
                    <StatusBadge status={payout.status} label={payoutStatusLabel[payout.status]} />
                  ),
                },
                {
                  header: 'Solicitado em',
                  cell: (payout) => new Date(payout.requestedAt).toLocaleString('pt-BR'),
                },
                {
                  header: 'Ações',
                  cell: (payout) => {
                    const disabled = transitionMutation.isPending;

                    if (payout.status === 'requested') {
                      return (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            disabled={disabled}
                            onClick={() => void transitionPayout(payout.id, 'processing')}
                          >
                            Processar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={disabled}
                            onClick={() => void transitionPayout(payout.id, 'canceled')}
                          >
                            Cancelar
                          </Button>
                        </div>
                      );
                    }

                    if (payout.status === 'processing') {
                      return (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            disabled={disabled}
                            onClick={() => void transitionPayout(payout.id, 'paid')}
                          >
                            Marcar pago
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={disabled}
                            onClick={() => void transitionPayout(payout.id, 'failed')}
                          >
                            Marcar falha
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={disabled}
                            onClick={() => void transitionPayout(payout.id, 'canceled')}
                          >
                            Cancelar
                          </Button>
                        </div>
                      );
                    }

                    return <span className="text-xs text-muted-foreground">Concluído</span>;
                  },
                },
              ]}
            />
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Transações</h2>
          <DataTable
            rows={transactions ?? []}
            rowKey={(transaction) => transaction.id}
            emptyLabel="Nenhuma transação registrada ainda."
            columns={[
              { header: 'ID', cell: (transaction) => transaction.id },
              { header: 'Descrição', cell: (transaction) => transaction.description },
              { header: 'Valor', cell: (transaction) => formatPrice(transaction.amountCents) },
              { header: 'Data', cell: (transaction) => transaction.date },
            ]}
          />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Notas fiscais</h2>
          <DataTable
            rows={invoices ?? []}
            rowKey={(invoice) => invoice.id}
            emptyLabel="Nenhuma nota fiscal emitida ainda."
            columns={[
              { header: 'Número', cell: (invoice) => invoice.id },
              { header: 'Valor', cell: (invoice) => formatPrice(invoice.amountCents) },
              {
                header: 'Status',
                cell: (invoice) => <StatusBadge status={invoice.status} label={invoice.status} />,
              },
              { header: 'Data', cell: (invoice) => invoice.date },
            ]}
          />
        </section>
      </div>
    </AdminLayout>
  );
};

export default AdminFinancePage;
