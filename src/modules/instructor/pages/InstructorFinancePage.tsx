import { useState } from 'react';
import { Clock3, Eye, Landmark, Plus, WalletCards } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import InstructorLayout from '@/app/layouts/InstructorLayout';
import { earningsService, type UnifiedPayoutRequest } from '@/modules/finance/services/earnings.service';
import DataTable from '@/shared/components/DataTable';
import PageHeader from '@/shared/components/PageHeader';
import StatCard from '@/shared/components/StatCard';
import StatusBadge from '@/shared/components/StatusBadge';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useToast } from '@/shared/hooks/use-toast';
import { formatPrice } from '@/shared/utils/formatters';

const statusLabel = {
  requested: 'Solicitado',
  processing: 'Em processamento',
  paid: 'Pago',
  failed: 'Falhou',
  rejected: 'Rejeitado',
  canceled: 'Cancelado',
} as const;

const InstructorFinancePage = () => {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['instructor-finance'],
    queryFn: () => earningsService.getSellerFinance(),
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [requestOpen, setRequestOpen] = useState(false);
  const [viewing, setViewing] = useState<UnifiedPayoutRequest | null>(null);

  const payoutMutation = useMutation({
    mutationFn: ({ targetDestinationId, amountCents }: { targetDestinationId: string; amountCents: number }) =>
      earningsService.requestSellerPayout(targetDestinationId, amountCents),
    onSuccess: async () => {
      setAmount('');
      setRequestOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['instructor-finance'] });
      toast({ title: 'Repasse solicitado', description: 'O valor foi reservado até o processamento administrativo.' });
    },
    onError: (mutationError) => {
      toast({
        title: 'Repasse não solicitado',
        description: mutationError instanceof Error ? mutationError.message : 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const destinations = data?.destinations ?? [];
  const selectedDestination = destinationId || destinations.find((destination) => destination.isDefault)?.id || destinations[0]?.id || '';
  const amountCents = Math.round(Number(amount.replace(',', '.')) * 100);
  const canRequest = Number.isFinite(amountCents)
    && amountCents > 0
    && amountCents <= (data?.balance.availableCents ?? 0)
    && Boolean(selectedDestination);

  const requestPayout = () => {
    if (!canRequest) return;
    payoutMutation.mutate({ targetDestinationId: selectedDestination, amountCents });
  };

  return (
    <InstructorLayout>
      <PageHeader
        title="Financeiro"
        subtitle="Receitas de cursos, valores em liberação e repasses. Solicitações e consultas abrem em popup."
        actions={<Button onClick={() => setRequestOpen(true)} disabled={!destinations.length}><Plus className="size-4" />Solicitar repasse</Button>}
      />

      {isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          <p>{error.message}</p>
          <Button className="mt-4" variant="outline" onClick={() => void refetch()}>Tentar novamente</Button>
        </div>
      ) : (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard label="Disponível para saque" value={formatPrice(data?.balance.availableCents ?? 0)} icon={WalletCards} />
            <StatCard label="Em liberação" value={formatPrice(data?.balance.pendingCents ?? 0)} icon={Clock3} />
            <StatCard label="Em processamento" value={formatPrice(data?.balance.allocatedCents ?? 0)} icon={Landmark} />
          </div>

          <section className="mb-10 rounded-xl border border-border bg-card p-5">
            <h2 className="font-display text-lg font-semibold text-white">Como o saldo é calculado</h2>
            <div className="mt-4 grid gap-3 text-sm leading-6 text-muted-foreground lg:grid-cols-3">
              <p>Cada venda preserva o preço, a comissão da plataforma e a participação do instrutor aplicados no momento do pagamento.</p>
              <p>Reembolsos e chargebacks geram lançamentos reversos; nenhum histórico é sobrescrito.</p>
              <p>O prazo de liberação e o valor mínimo de saque são parâmetros definidos pelo Portal do Administrador.</p>
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-display text-lg font-semibold text-white">Histórico de repasses</h2>
            <DataTable
              rows={data?.payouts ?? []}
              rowKey={(request) => request.id}
              emptyLabel={isLoading ? 'Carregando repasses...' : 'Nenhum repasse solicitado.'}
              columns={[
                { header: 'Solicitado em', cell: (request) => new Date(request.requestedAt).toLocaleString('pt-BR') },
                { header: 'Valor', cell: (request) => formatPrice(request.amountCents, request.currency) },
                { header: 'Status', cell: (request) => <StatusBadge status={request.status} label={statusLabel[request.status]} /> },
                { header: 'Processado em', cell: (request) => request.processedAt ? new Date(request.processedAt).toLocaleString('pt-BR') : '—' },
                { header: 'Ações', cell: (request) => <Button size="sm" variant="outline" onClick={() => setViewing(request)}><Eye className="size-4" />Visualizar</Button> },
              ]}
            />
          </section>
        </>
      )}

      <Dialog open={requestOpen} onOpenChange={(open) => !payoutMutation.isPending && setRequestOpen(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar repasse</DialogTitle>
            <DialogDescription>Somente receitas já liberadas podem ser solicitadas. Disponível: {formatPrice(data?.balance.availableCents ?? 0)}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instructor-payout-destination">Destino verificado</Label>
              <select
                id="instructor-payout-destination"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={selectedDestination}
                onChange={(event) => setDestinationId(event.target.value)}
                disabled={!destinations.length || payoutMutation.isPending}
              >
                {!destinations.length && <option value="">Nenhum destino verificado</option>}
                {destinations.map((destination) => <option key={destination.id} value={destination.id}>{destination.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="instructor-payout-amount">Valor (R$)</Label>
              <Input id="instructor-payout-amount" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={payoutMutation.isPending} onClick={() => setRequestOpen(false)}>Cancelar</Button>
            <Button disabled={!canRequest || payoutMutation.isPending} onClick={requestPayout}>{payoutMutation.isPending ? 'Solicitando...' : 'Solicitar repasse'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Visualizar repasse</DialogTitle><DialogDescription>Detalhes completos da solicitação financeira.</DialogDescription></DialogHeader>
          {viewing && <div className="grid gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">Valor</p><p className="mt-1 font-semibold text-white">{formatPrice(viewing.amountCents, viewing.currency)}</p></div><div><p className="text-xs text-muted-foreground">Status</p><div className="mt-1"><StatusBadge status={viewing.status} label={statusLabel[viewing.status]} /></div></div><div><p className="text-xs text-muted-foreground">Solicitado em</p><p className="mt-1 text-white">{new Date(viewing.requestedAt).toLocaleString('pt-BR')}</p></div><div><p className="text-xs text-muted-foreground">Processado em</p><p className="mt-1 text-white">{viewing.processedAt ? new Date(viewing.processedAt).toLocaleString('pt-BR') : 'Ainda não processado'}</p></div><div className="sm:col-span-2"><p className="text-xs text-muted-foreground">Identificador</p><p className="mt-1 break-all font-mono text-xs text-white">{viewing.id}</p></div></div>}
          <DialogFooter><Button variant="outline" onClick={() => setViewing(null)}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </InstructorLayout>
  );
};

export default InstructorFinancePage;
