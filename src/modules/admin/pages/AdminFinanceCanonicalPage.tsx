import { useState } from 'react';
import { AlertTriangle, Banknote, ReceiptText, RotateCcw, WalletCards } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import AdminLayout from '@/app/layouts/AdminLayout';
import { adminCanonicalFinanceService, type CanonicalAdminOrder, type CanonicalPayout } from '@/modules/admin/services/adminCanonicalFinance.service';
import DataTable from '@/shared/components/DataTable';
import ErrorState from '@/shared/components/ErrorState';
import LoadingState from '@/shared/components/LoadingState';
import PageHeader from '@/shared/components/PageHeader';
import StatCard from '@/shared/components/StatCard';
import StatusBadge from '@/shared/components/StatusBadge';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { useToast } from '@/shared/hooks/use-toast';
import { formatPrice } from '@/shared/utils/formatters';

const payoutLabels: Record<CanonicalPayout['status'], string> = {
  requested: 'Solicitado', processing: 'Em processamento', paid: 'Pago', failed: 'Falhou',
  rejected: 'Rejeitado', canceled: 'Cancelado',
};

const AdminFinanceCanonicalPage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [adjustment, setAdjustment] = useState<{ order: CanonicalAdminOrder; type: 'refund' | 'chargeback' } | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-canonical-finance'],
    queryFn: () => adminCanonicalFinanceService.getDashboard(),
  });

  const refresh = async () => queryClient.invalidateQueries({ queryKey: ['admin-canonical-finance'] });
  const adjustmentMutation = useMutation({
    mutationFn: async () => {
      if (!adjustment) throw new Error('Pedido não selecionado.');
      const amountCents = Math.round(Number(amount.replace(',', '.')) * 100);
      if (!Number.isFinite(amountCents) || amountCents <= 0 || amountCents > adjustment.order.adjustableCents) throw new Error('Valor de ajuste inválido.');
      await adminCanonicalFinanceService.recordAdjustment(adjustment.order.id, adjustment.type, amountCents, reason);
    },
    onSuccess: async () => {
      setAdjustment(null); setAmount(''); setReason(''); await refresh();
      toast({ title: 'Ajuste financeiro registrado', description: 'O ledger recebeu uma transação reversa; o histórico original foi preservado.' });
    },
    onError: (mutationError) => toast({ title: 'Ajuste não registrado', description: mutationError instanceof Error ? mutationError.message : 'Tente novamente.', variant: 'destructive' }),
  });
  const payoutMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Exclude<CanonicalPayout['status'], 'requested'> }) => adminCanonicalFinanceService.transitionPayout(id, status),
    onSuccess: async () => { await refresh(); toast({ title: 'Repasse atualizado' }); },
    onError: (mutationError) => toast({ title: 'Repasse não atualizado', description: mutationError instanceof Error ? mutationError.message : 'Tente novamente.', variant: 'destructive' }),
  });

  return (
    <AdminLayout>
      <PageHeader title="Financeiro canônico" subtitle="Pagamentos, ajustes, obrigações, repasses e ledger da plataforma." />

      {isLoading && <LoadingState rows={6} />}
      {isError && <ErrorState description={error.message} onRetry={() => void refetch()} />}

      {data && !isLoading && !isError && (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <StatCard label="Vendas brutas" value={formatPrice(data.summary.grossPaidCents)} icon={ReceiptText} />
            <StatCard label="Reembolsado" value={formatPrice(data.summary.refundedCents)} icon={RotateCcw} />
            <StatCard label="Chargebacks" value={formatPrice(data.summary.chargebackCents)} icon={AlertTriangle} />
            <StatCard label="Receita da plataforma" value={formatPrice(data.summary.platformRevenueCents)} icon={WalletCards} />
            <StatCard label="Obrigações a repassar" value={formatPrice(data.summary.payableCents)} icon={Banknote} />
            <StatCard label="Saldo de caixa" value={formatPrice(data.summary.cashBalanceCents)} icon={WalletCards} />
          </div>

          <section className="mb-10">
            <h2 className="mb-3 font-display text-lg font-semibold text-white">Pedidos e pagamentos</h2>
            <DataTable rows={data.orders} rowKey={(order) => order.id} emptyLabel="Nenhum pedido registrado." columns={[
              { header: 'Pedido', cell: (order) => order.id.slice(0, 8) },
              { header: 'Itens', cell: (order) => order.itemTitles.join(', ') || '—' },
              { header: 'Total', cell: (order) => formatPrice(order.totalCents, order.currency) },
              { header: 'Status', cell: (order) => <StatusBadge status={order.status} label={order.status} /> },
              { header: 'Ajustável', cell: (order) => formatPrice(order.adjustableCents, order.currency) },
              { header: 'Pago em', cell: (order) => order.paidAt ? new Date(order.paidAt).toLocaleString('pt-BR') : '—' },
              { header: 'Ações', cell: (order) => order.adjustableCents > 0 ? <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => { setAdjustment({ order, type: 'refund' }); setAmount((order.adjustableCents / 100).toFixed(2)); }}>Reembolsar</Button><Button size="sm" variant="outline" className="text-amber-200" onClick={() => { setAdjustment({ order, type: 'chargeback' }); setAmount((order.adjustableCents / 100).toFixed(2)); }}>Chargeback</Button></div> : <span className="text-xs text-muted-foreground">Sem saldo</span> },
            ]} />
          </section>

          <section>
            <h2 className="mb-3 font-display text-lg font-semibold text-white">Repasses unificados</h2>
            <DataTable rows={data.payouts} rowKey={(payout) => payout.id} emptyLabel="Nenhum repasse solicitado." columns={[
              { header: 'Beneficiário', cell: (payout) => payout.beneficiaryType === 'affiliate' ? 'Afiliado' : 'Vendedor / instrutor' },
              { header: 'Destino', cell: (payout) => payout.destinationLabel },
              { header: 'Valor', cell: (payout) => formatPrice(payout.amountCents, payout.currency) },
              { header: 'Status', cell: (payout) => <StatusBadge status={payout.status} label={payoutLabels[payout.status]} /> },
              { header: 'Solicitado em', cell: (payout) => new Date(payout.requestedAt).toLocaleString('pt-BR') },
              { header: 'Ações', cell: (payout) => payout.status === 'requested' ? <div className="flex gap-2"><Button size="sm" disabled={payoutMutation.isPending} onClick={() => payoutMutation.mutate({ id: payout.id, status: 'processing' })}>Processar</Button><Button size="sm" variant="outline" disabled={payoutMutation.isPending} onClick={() => payoutMutation.mutate({ id: payout.id, status: 'rejected' })}>Rejeitar</Button></div> : payout.status === 'processing' ? <div className="flex gap-2"><Button size="sm" disabled={payoutMutation.isPending} onClick={() => payoutMutation.mutate({ id: payout.id, status: 'paid' })}>Marcar pago</Button><Button size="sm" variant="outline" disabled={payoutMutation.isPending} onClick={() => payoutMutation.mutate({ id: payout.id, status: 'failed' })}>Marcar falha</Button></div> : <span className="text-xs text-muted-foreground">Concluído</span> },
            ]} />
          </section>
        </>
      )}

      <Dialog open={Boolean(adjustment)} onOpenChange={(open) => !open && setAdjustment(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{adjustment?.type === 'refund' ? 'Registrar reembolso' : 'Registrar chargeback'}</DialogTitle><DialogDescription>Será criada uma transação reversa no ledger. O pagamento original não será alterado nem apagado.</DialogDescription></DialogHeader>
          <div className="space-y-4"><div className="space-y-2"><Label htmlFor="finance-adjustment-amount">Valor (R$)</Label><Input id="finance-adjustment-amount" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="finance-adjustment-reason">Motivo</Label><Textarea id="finance-adjustment-reason" rows={5} value={reason} onChange={(event) => setReason(event.target.value)} /></div></div>
          <DialogFooter><Button variant="outline" onClick={() => setAdjustment(null)}>Cancelar</Button><Button variant={adjustment?.type === 'chargeback' ? 'destructive' : 'default'} disabled={reason.trim().length < 5 || adjustmentMutation.isPending} onClick={() => adjustmentMutation.mutate()}>{adjustmentMutation.isPending ? 'Registrando...' : 'Confirmar ajuste'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminFinanceCanonicalPage;
