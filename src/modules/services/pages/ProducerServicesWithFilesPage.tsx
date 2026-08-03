import { useState } from 'react';
import { FileUp, PackageCheck, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import ProducerLayout from '@/app/layouts/ProducerLayout';
import { serviceDeliveryStorageService } from '@/modules/services/services/serviceDeliveryStorage.service';
import { serviceMarketplaceService } from '@/modules/services/services/serviceMarketplace.service';
import type { ServiceContract, ServiceMilestone } from '@/modules/services/types/serviceMarketplace.types';
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

const labels: Record<ServiceContract['status'], string> = {
  active: 'Em andamento', delivery_submitted: 'Entrega enviada', revision_requested: 'Revisão solicitada',
  completed: 'Concluído', disputed: 'Em disputa', canceled: 'Cancelado', refunded: 'Reembolsado',
};

const ProducerServicesWithFilesPage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selection, setSelection] = useState<{ contract: ServiceContract; milestone: ServiceMilestone } | null>(null);
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['provider-service-contracts'],
    queryFn: () => serviceMarketplaceService.listContracts('provider'),
  });

  const deliveryMutation = useMutation({
    mutationFn: async () => {
      if (!selection) throw new Error('Marco não selecionado.');
      const uploaded: string[] = [];
      for (const file of files) {
        uploaded.push(await serviceDeliveryStorageService.upload(selection.contract.id, selection.milestone.id, file));
      }
      await serviceMarketplaceService.submitDelivery(selection.milestone.id, notes, uploaded);
    },
    onSuccess: async () => {
      setSelection(null); setNotes(''); setFiles([]);
      await queryClient.invalidateQueries({ queryKey: ['provider-service-contracts'] });
      toast({ title: 'Entrega enviada', description: 'Os arquivos estão privados e disponíveis somente aos participantes do contrato.' });
    },
    onError: (mutationError) => toast({ title: 'Entrega não enviada', description: mutationError instanceof Error ? mutationError.message : 'Tente novamente.', variant: 'destructive' }),
  });

  const addFiles = (selected: FileList | null) => {
    if (!selected) return;
    const next = [...selected];
    const validation = next.map((file) => serviceDeliveryStorageService.validateFile(file)).find(Boolean);
    if (validation) {
      toast({ title: 'Arquivo não aceito', description: validation, variant: 'destructive' });
      return;
    }
    setFiles((current) => [...current, ...next].slice(0, 10));
  };

  return (
    <ProducerLayout>
      <PageHeader title="Serviços" subtitle="Contratos, prazos, entregas privadas e liberação financeira." />
      {isError ? <ErrorState description={error.message} onRetry={() => void refetch()} /> : !isLoading && !data?.length ? (
        <EmptyState icon={PackageCheck} title="Nenhum contrato de serviço" description="As contratações confirmadas aparecerão aqui." />
      ) : (
        <div className="space-y-6">
          {(data ?? []).map((contract) => (
            <section key={contract.id} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <div className="flex flex-col gap-4 border-b border-white/8 pb-5 sm:flex-row sm:justify-between">
                <div><StatusBadge status={contract.status} label={labels[contract.status]} /><h2 className="mt-3 font-display text-xl font-semibold text-white">{contract.title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{contract.scope}</p></div>
                <div className="shrink-0 sm:text-right"><p className="font-display text-xl font-bold text-white">{formatPrice(contract.totalCents, contract.currency)}</p><p className="mt-1 text-xs text-muted-foreground">{contract.dueAt ? `Prazo: ${new Date(contract.dueAt).toLocaleDateString('pt-BR')}` : 'Sem prazo definido'}</p></div>
              </div>
              <div className="mt-5">
                <DataTable rows={contract.milestones} rowKey={(milestone) => milestone.id} emptyLabel="Nenhum marco cadastrado." columns={[
                  { header: 'Marco', cell: (milestone) => milestone.title },
                  { header: 'Valor', cell: (milestone) => formatPrice(milestone.amountCents, milestone.currency) },
                  { header: 'Situação', cell: (milestone) => <StatusBadge status={milestone.status} label={milestone.status} /> },
                  { header: 'Versões', cell: (milestone) => String(milestone.deliveries.length) },
                  { header: 'Ações', cell: (milestone) => ['pending','in_progress','revision_requested'].includes(milestone.status) ? <Button size="sm" onClick={() => setSelection({ contract, milestone })}><FileUp className="size-4" />Enviar entrega</Button> : <span className="text-xs text-muted-foreground">—</span> },
                ]} />
              </div>
            </section>
          ))}
        </div>
      )}

      <Dialog open={Boolean(selection)} onOpenChange={(open) => !open && setSelection(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Enviar entrega privada</DialogTitle><DialogDescription>Até 10 arquivos por versão, com no máximo 1 GB por arquivo. O acesso exige participação no contrato.</DialogDescription></DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2"><Label htmlFor="service-delivery-files">Arquivos</Label><Input id="service-delivery-files" type="file" multiple onChange={(event) => addFiles(event.target.files)} /></div>
            {!!files.length && <div className="space-y-2">{files.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"><span className="min-w-0 truncate">{file.name}</span><Button type="button" size="icon" variant="ghost" onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}><X className="size-4" /></Button></div>)}</div>}
            <div className="space-y-2"><Label htmlFor="service-delivery-notes">Descrição da versão</Label><Textarea id="service-delivery-notes" rows={6} value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setSelection(null)}>Cancelar</Button><Button disabled={!files.length || notes.trim().length < 5 || deliveryMutation.isPending} onClick={() => deliveryMutation.mutate()}>{deliveryMutation.isPending ? 'Enviando arquivos...' : 'Enviar entrega'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </ProducerLayout>
  );
};

export default ProducerServicesWithFilesPage;
