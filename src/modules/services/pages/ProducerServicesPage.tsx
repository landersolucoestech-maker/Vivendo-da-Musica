import { useState } from 'react';
import { FileUp, PackageCheck } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import ProducerLayout from '@/app/layouts/ProducerLayout';
import { serviceMarketplaceService } from '@/modules/services/services/serviceMarketplace.service';
import type { ServiceContract, ServiceMilestone } from '@/modules/services/types/serviceMarketplace.types';
import DataTable from '@/shared/components/DataTable';
import EmptyState from '@/shared/components/EmptyState';
import ErrorState from '@/shared/components/ErrorState';
import PageHeader from '@/shared/components/PageHeader';
import StatusBadge from '@/shared/components/StatusBadge';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { useToast } from '@/shared/hooks/use-toast';
import { formatPrice } from '@/shared/utils/formatters';

const contractLabels: Record<ServiceContract['status'], string> = {
  active: 'Em andamento',
  delivery_submitted: 'Entrega enviada',
  revision_requested: 'Revisão solicitada',
  completed: 'Concluído',
  disputed: 'Em disputa',
  canceled: 'Cancelado',
  refunded: 'Reembolsado',
};

const ProducerServicesPage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedMilestone, setSelectedMilestone] = useState<ServiceMilestone | null>(null);
  const [notes, setNotes] = useState('');
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['provider-service-contracts'],
    queryFn: () => serviceMarketplaceService.listContracts('provider'),
  });

  const deliveryMutation = useMutation({
    mutationFn: () => {
      if (!selectedMilestone) throw new Error('Marco não selecionado.');
      return serviceMarketplaceService.submitDelivery(selectedMilestone.id, notes);
    },
    onSuccess: async () => {
      setSelectedMilestone(null);
      setNotes('');
      await queryClient.invalidateQueries({ queryKey: ['provider-service-contracts'] });
      toast({ title: 'Entrega enviada', description: 'O contratante já pode revisar e aceitar o material.' });
    },
    onError: (mutationError) => toast({
      title: 'Entrega não enviada',
      description: mutationError instanceof Error ? mutationError.message : 'Tente novamente.',
      variant: 'destructive',
    }),
  });

  return (
    <ProducerLayout>
      <PageHeader title="Serviços" subtitle="Acompanhe contratos, prazos, entregas e liberação financeira." />

      {isError ? (
        <ErrorState description={error.message} onRetry={() => void refetch()} />
      ) : !isLoading && !data?.length ? (
        <EmptyState
          icon={PackageCheck}
          title="Nenhum contrato de serviço"
          description="As contratações confirmadas aparecerão aqui."
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
                    { header: 'Versões', cell: (milestone) => String(milestone.deliveries.length) },
                    {
                      header: 'Ações',
                      cell: (milestone) => ['pending', 'in_progress', 'revision_requested'].includes(milestone.status)
                        ? (
                          <Button size="sm" onClick={() => setSelectedMilestone(milestone)}>
                            <FileUp className="size-4" />Enviar entrega
                          </Button>
                        )
                        : <span className="text-xs text-muted-foreground">—</span>,
                    },
                  ]}
                />
              </div>
            </section>
          ))}
        </div>
      )}

      <Dialog open={Boolean(selectedMilestone)} onOpenChange={(open) => !open && setSelectedMilestone(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar entrega</DialogTitle>
            <DialogDescription>
              Registre as orientações desta versão. O upload privado de arquivos será vinculado ao mesmo marco.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="service-delivery-notes">Descrição da entrega</Label>
            <Textarea
              id="service-delivery-notes"
              rows={7}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Descreva o que foi entregue, versão e observações para análise."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedMilestone(null)}>Cancelar</Button>
            <Button
              disabled={notes.trim().length < 5 || deliveryMutation.isPending}
              onClick={() => deliveryMutation.mutate()}
            >
              {deliveryMutation.isPending ? 'Enviando...' : 'Registrar entrega'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProducerLayout>
  );
};

export default ProducerServicesPage;
