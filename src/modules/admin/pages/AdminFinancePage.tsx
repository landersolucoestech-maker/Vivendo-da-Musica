import { Clock, Percent, Receipt, Wallet } from 'lucide-react';

import AdminLayout from '@/app/layouts/AdminLayout';
import {
  useAdminAffiliateWithdrawals,
  useAdminFinanceSummary,
  useAdminInvoices,
  useAdminProducerPayouts,
  useAdminTransactions,
  useTransitionAffiliateWithdrawal,
  useTransitionProducerPayout,
} from '@/modules/admin/hooks/useAdminFinance';
import type {
  AdminAffiliateWithdrawalStatus,
  AdminPayoutStatus,
} from '@/modules/admin/services/admin-finance.service';
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

const withdrawalStatusLabel: Record<AdminAffiliateWithdrawalStatus, string> = {
  requested: 'Solicitado',
  processing: 'Em processamento',
  paid: 'Pago',
  rejected: 'Rejeitado',
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
  const {
    data: affiliateWithdrawals,
    isLoading: affiliateWithdrawalsLoading,
    isError: affiliateWithdrawalsError,
  } = useAdminAffiliateWithdrawals();
  const transitionMutation = useTransitionProducerPayout();
  const affiliateTransitionMutation = useTransitionAffiliateWithdrawal();
  const { toast } = useToast();

  const pendingPayoutCents = [
    ...(payouts ?? []).map((payout) => ({ amount: payout.amountCents, status: payout.status })),
    ...(affiliateWithdrawals ?? []).map((withdrawal) => ({ amount: withdrawal.amountCents, status: withdrawal.status })),
  ]
    .filter((item) => item.status === 'requested' || item.status === 'processing')
    .reduce((total, item) => total + item.amount, 0);

  const transitionPayout = async (
    payoutId: string,
    status: Exclude<AdminPayoutStatus, 'requested'>,
  ) => {
    try {
      await transitionMutation.mutateAsync({ payoutId, status });
      toast({ title: 'Repasse atualizado', description: `Novo status: ${payoutStatusLabel[status]}.` });
    } catch (error) {
      toast({
        title: 'Não foi possível atualizar o repasse',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const transitionAffiliateWithdrawal = async (
    withdrawalId: string,
    status: Exclude<AdminAffiliateWithdrawalStatus, 'requested'>,
  ) => {
    try {
      await affiliateTransitionMutation.mutateAsync({ withdrawalId, status });
      toast({ title: 'Saque atualizado', description: `Novo status: ${withdrawalStatusLabel[status]}.` });
    } catch (error) {
      toast({
        title: 'Não foi possível atualizar o saque',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AdminLayout>
      <PageHeader title="Financeiro" subtitle="Saldo, repasses, saques, transações e notas fiscais." />

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
              Processamento financeiro com restituição automática em falha ou cancelamento.
            </p>
          </div>

          {payoutsError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              Não foi possível carregar os repasses.
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
                { header: 'Status', cell: (payout) => <StatusBadge status={payout.status} label={payoutStatusLabel[payout.status]} /> },
                { header: 'Solicitado em', cell: (payout) => new Date(payout.requestedAt).toLocaleString('pt-BR') },
                {
                  header: 'Ações',
                  cell: (payout) => {
                    const disabled = transitionMutation.isPending;
                    if (payout.status === 'requested') {
                      return (
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" disabled={disabled} onClick={() => void transitionPayout(payout.id, 'processing')}>Processar</Button>
                          <Button size="sm" variant="outline" disabled={disabled} onClick={() => void transitionPayout(payout.id, 'canceled')}>Cancelar</Button>
                        </div>
                      );
                    }
                    if (payout.status === 'processing') {
                      return (
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" disabled={disabled} onClick={() => void transitionPayout(payout.id, 'paid')}>Marcar pago</Button>
                          <Button size="sm" variant="outline" disabled={disabled} onClick={() => void transitionPayout(payout.id, 'failed')}>Marcar falha</Button>
                          <Button size="sm" variant="outline" disabled={disabled} onClick={() => void transitionPayout(payout.id, 'canceled')}>Cancelar</Button>
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
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground">Saques de afiliados</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Saques rejeitados ou cancelados devolvem o saldo ao afiliado de forma atômica.
            </p>
          </div>

          {affiliateWithdrawalsError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              Não foi possível carregar os saques de afiliados.
            </div>
          ) : (
            <DataTable
              rows={affiliateWithdrawals ?? []}
              rowKey={(withdrawal) => withdrawal.id}
              emptyLabel={affiliateWithdrawalsLoading ? 'Carregando saques...' : 'Nenhum saque solicitado.'}
              columns={[
                { header: 'Afiliado', cell: (withdrawal) => withdrawal.affiliateName },
                { header: 'Método', cell: (withdrawal) => withdrawal.paymentMethod === 'pix' ? 'Pix' : 'Transferência bancária' },
                { header: 'Valor', cell: (withdrawal) => formatPrice(withdrawal.amountCents) },
                { header: 'Status', cell: (withdrawal) => <StatusBadge status={withdrawal.status} label={withdrawalStatusLabel[withdrawal.status]} /> },
                { header: 'Solicitado em', cell: (withdrawal) => new Date(withdrawal.requestedAt).toLocaleString('pt-BR') },
                {
                  header: 'Ações',
                  cell: (withdrawal) => {
                    const disabled = affiliateTransitionMutation.isPending;
                    if (withdrawal.status === 'requested') {
                      return (
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" disabled={disabled} onClick={() => void transitionAffiliateWithdrawal(withdrawal.id, 'processing')}>Processar</Button>
                          <Button size="sm" variant="outline" disabled={disabled} onClick={() => void transitionAffiliateWithdrawal(withdrawal.id, 'rejected')}>Rejeitar</Button>
                          <Button size="sm" variant="outline" disabled={disabled} onClick={() => void transitionAffiliateWithdrawal(withdrawal.id, 'canceled')}>Cancelar</Button>
                        </div>
                      );
                    }
                    if (withdrawal.status === 'processing') {
                      return (
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" disabled={disabled} onClick={() => void transitionAffiliateWithdrawal(withdrawal.id, 'paid')}>Marcar pago</Button>
                          <Button size="sm" variant="outline" disabled={disabled} onClick={() => void transitionAffiliateWithdrawal(withdrawal.id, 'rejected')}>Rejeitar</Button>
                          <Button size="sm" variant="outline" disabled={disabled} onClick={() => void transitionAffiliateWithdrawal(withdrawal.id, 'canceled')}>Cancelar</Button>
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
