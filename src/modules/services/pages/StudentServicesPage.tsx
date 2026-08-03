import { useState } from 'react';
import { CheckCircle2, Clock3, FileCheck2, ShieldAlert } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import StudentLayout from '@/app/layouts/StudentLayout';
import { serviceMarketplaceService } from '@/modules/services/services/serviceMarketplace.service';
import type { ServiceContract } from '@/modules/services/types/serviceMarketplace.types';
import DataTable from '@/shared/components/DataTable';
import EmptyState from '@/shared/components/EmptyState';
import ErrorState from '@/shared/components/ErrorState';
import PageHeader from '@/shared/components/PageHeader';
import StatusBadge from '@/shared/components/StatusBadge';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { useToast } from '@/shared/hooks/use-toast';
import { formatPrice } from '@/shared/utils/formatters';

const contractLabels: Record<ServiceContract['status'], string> = {
  active: 'Em andamento',
  delivery_submitted: 'Aguardando análise',
  revision_requested: 'Revisão solicitada',
  completed: 'Concluído',
  disputed: 'Em disputa',
  canceled: 'Cancelado',
  refunded: 'Reembolsado',
};

const StudentServicesPage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [disputeContract, setDisputeContract] = useState<ServiceContract | null>(null);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['student-service-contracts'],
    queryFn: () => serviceMarketplaceService.listContracts('buyer'),
  });

  const acceptMutation = useMutation({
    mutationFn: (milestoneId: string) => serviceMarketplaceService.acceptMilestone(milestoneId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['student-service-contracts'] });
      toast({ title: 'Entrega aceita', description: 'O contrato e o financeiro foram atualizados.' });
    },
    onError: (mutationError) => toast({
      title: 'Entrega não aceita',
      description: mutationError instanceof Error ? mutationError.message : 'Tente novamente.',
      variant: 'destructive',
    }),
  });

  const disputeMutation = useMutation({
    mutationFn: () => {
      if (!disputeContract) throw new Error('Contrato não selecionado.');
      return serviceMarketplaceService.openDispute(disputeContract.id, reason, description);
    },
    onSuccess: async () => {
      setDisputeContract(null);
      setReason('');
      setDescription('');
      await queryClient.invalidateQueries({ queryKey: ['student-service-contracts'] });
      toast({ title: 'Disputa aberta', description: 'O saldo permanece reservado durante a análise.' });
    },
    onError: (mutationError) => toast({
      title: 'Disputa não aberta',
      description: mutationError instanceof Error ? mutationError.message : 'Tente novamente.',
      variant: 'destructive',
    }),
  });

  return (
    <StudentLayout>
      <PageHeader title="Serviços contratados" subtitle="Acompanhe escopo, entregas, aceite e eventuais disputas." />

      {isError ? (
        <ErrorState description={error.message} onRetry={() => void refetch()} />
      ) : !isLoading && !data?.length ? (
        <EmptyState
          icon={FileCheck2}
          title="Nenhum serviço contratado"
          description="As contratações feitas no marketplace aparecerão aqui."
        />
      ) : (
        <div className="space-y-6">
          {(data ?? []).map((contract) => (
            <section key={contract.id} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <div className="flex flex-col gap-4 border-b border-white/8 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={contract.status} label={contractLabels[contract.status]} />
                    <span className="text-xs text-muted-foreground">Contrato {contract.id.slice(0, 8)}</span>
                  </div>
                  <h2 className="mt-3 font-display text-xl font-semibold text-white">{contract.title}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{contract.scope}</p>
                </div>
                <div className="shrink-0 text-left sm:text-right">
                  <p className="font-display text-xl font-bold text-white">{formatPrice(contract.totalCents, contract.currency)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {contract.dueAt ? `Prazo: ${new Date(contract.dueAt).toLocaleDateString('pt-BR')}` : 'Sem prazo definido'}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <DataTable
                  rows={contract.milestones}
                  rowKey={(milestone) => milestone.id}
                  emptyLabel="Nenhum marco cadastrado."
                  columns={[
                    { header: 'Marco', cell: (milestone) => milestone.title },
                    { header: 'Valor', cell: (milestone) => formatPrice(milestone.amountCents, milestone.currency) },
                    { header: 'Situação', cell: (milestone) => <StatusBadge status={milestone.status} label={milestone.status} /> },
                    {
                      header: 'Entrega',
                      cell: (milestone) => milestone.deliveries[0]
                        ? <span className="inline-flex items-center gap-1.5 text-emerald-300"><CheckCircle2 className="size-4" />Versão {milestone.deliveries[0].version}</span>
                        : <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Clock3 className="size-4" />Aguardando</span>,
                    },
                    {
                      header: 'Ações',
                      cell: (milestone) => milestone.status === 'submitted'
                        ? <Button size="sm" disabled={acceptMutation.isPending} onClick={() => acceptMutation.mutate(milestone.id)}>Aceitar entrega</Button>
                        : <span className="text-xs text-muted-foreground">—</span>,
                    },
                  ]}
                />
              </div>

              {['active', 'delivery_submitted', 'revision_requested'].includes(contract.status) && (
                <div className="mt-5 flex justify-end border-t border-white/8 pt-5">
                  <Button variant="outline" className="text-amber-200" onClick={() => setDisputeContract(contract)}>
                    <ShieldAlert className="size-4" />Abrir disputa
                  </Button>
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      <Dialog open={Boolean(disputeContract)} onOpenChange={(open) => !open && setDisputeContract(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir disputa</DialogTitle>
            <DialogDescription>Informe o motivo com detalhes. O valor continuará reservado até a decisão administrativa.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="service-dispute-reason">Motivo</Label>
              <Input id="service-dispute-reason" value={reason} onChange={(event) => setReason(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service-dispute-description">Descrição</Label>
              <Textarea id="service-dispute-description" rows={6} value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeContract(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={reason.trim().length < 3 || description.trim().length < 10 || disputeMutation.isPending}
              onClick={() => disputeMutation.mutate()}
            >
              {disputeMutation.isPending ? 'Abrindo...' : 'Confirmar disputa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StudentLayout>
  );
};

export default StudentServicesPage;
