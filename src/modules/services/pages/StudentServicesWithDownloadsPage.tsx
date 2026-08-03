import { useState } from 'react';
import { CheckCircle2, Clock3, Download, FileCheck2, ShieldAlert } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import StudentLayout from '@/app/layouts/StudentLayout';
import { serviceDeliveryStorageService } from '@/modules/services/services/serviceDeliveryStorage.service';
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

const labels: Record<ServiceContract['status'], string> = {
  active: 'Em andamento', delivery_submitted: 'Aguardando análise', revision_requested: 'Revisão solicitada',
  completed: 'Concluído', disputed: 'Em disputa', canceled: 'Cancelado', refunded: 'Reembolsado',
};

const fileName = (path: string) => decodeURIComponent(path.split('/').pop() ?? 'arquivo');

const StudentServicesWithDownloadsPage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [disputeContract, setDisputeContract] = useState<ServiceContract | null>(null);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['student-service-contracts'],
    queryFn: () => serviceMarketplaceService.listContracts('buyer'),
  });

  const acceptMutation = useMutation({
    mutationFn: (milestoneId: string) => serviceMarketplaceService.acceptMilestone(milestoneId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['student-service-contracts'] });
      toast({ title: 'Entrega aceita', description: 'O contrato e a liberação financeira foram atualizados.' });
    },
    onError: (mutationError) => toast({ title: 'Entrega não aceita', description: mutationError instanceof Error ? mutationError.message : 'Tente novamente.', variant: 'destructive' }),
  });

  const disputeMutation = useMutation({
    mutationFn: () => {
      if (!disputeContract) throw new Error('Contrato não selecionado.');
      return serviceMarketplaceService.openDispute(disputeContract.id, reason, description);
    },
    onSuccess: async () => {
      setDisputeContract(null); setReason(''); setDescription('');
      await queryClient.invalidateQueries({ queryKey: ['student-service-contracts'] });
      toast({ title: 'Disputa aberta', description: 'O saldo permanece reservado durante a análise.' });
    },
    onError: (mutationError) => toast({ title: 'Disputa não aberta', description: mutationError instanceof Error ? mutationError.message : 'Tente novamente.', variant: 'destructive' }),
  });

  const download = async (path: string) => {
    setDownloadingPath(path);
    try {
      const signedUrl = await serviceDeliveryStorageService.createDownloadUrl(path);
      const anchor = document.createElement('a');
      anchor.href = signedUrl;
      anchor.download = fileName(path);
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (downloadError) {
      toast({ title: 'Arquivo não liberado', description: downloadError instanceof Error ? downloadError.message : 'Tente novamente.', variant: 'destructive' });
    } finally {
      setDownloadingPath(null);
    }
  };

  return (
    <StudentLayout>
      <PageHeader title="Serviços contratados" subtitle="Acompanhe escopo, arquivos, aceite e eventuais disputas." />
      {isError ? <ErrorState description={error.message} onRetry={() => void refetch()} /> : !isLoading && !data?.length ? (
        <EmptyState icon={FileCheck2} title="Nenhum serviço contratado" description="As contratações feitas no marketplace aparecerão aqui." />
      ) : (
        <div className="space-y-6">
          {(data ?? []).map((contract) => (
            <section key={contract.id} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <div className="flex flex-col gap-4 border-b border-white/8 pb-5 sm:flex-row sm:justify-between">
                <div><div className="flex flex-wrap items-center gap-2"><StatusBadge status={contract.status} label={labels[contract.status]} /><span className="text-xs text-muted-foreground">Contrato {contract.id.slice(0,8)}</span></div><h2 className="mt-3 font-display text-xl font-semibold text-white">{contract.title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{contract.scope}</p></div>
                <div className="shrink-0 sm:text-right"><p className="font-display text-xl font-bold text-white">{formatPrice(contract.totalCents, contract.currency)}</p><p className="mt-1 text-xs text-muted-foreground">{contract.dueAt ? `Prazo: ${new Date(contract.dueAt).toLocaleDateString('pt-BR')}` : 'Sem prazo definido'}</p></div>
              </div>

              <div className="mt-5 space-y-5">
                {contract.milestones.map((milestone) => {
                  const delivery = milestone.deliveries[0];
                  return (
                    <div key={milestone.id} className="rounded-xl border border-white/8 bg-background/40 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div><h3 className="font-semibold text-white">{milestone.title}</h3><p className="mt-1 text-xs text-muted-foreground">{formatPrice(milestone.amountCents, milestone.currency)} · {milestone.status}</p></div>
                        {milestone.status === 'submitted' && <Button size="sm" disabled={acceptMutation.isPending} onClick={() => acceptMutation.mutate(milestone.id)}>Aceitar entrega</Button>}
                      </div>
                      {delivery ? (
                        <div className="mt-4 border-t border-white/8 pt-4">
                          <p className="inline-flex items-center gap-2 text-sm text-emerald-300"><CheckCircle2 className="size-4" />Versão {delivery.version} enviada em {new Date(delivery.submittedAt).toLocaleString('pt-BR')}</p>
                          {delivery.notes && <p className="mt-3 text-sm leading-6 text-muted-foreground">{delivery.notes}</p>}
                          {!!delivery.filePaths.length && <div className="mt-4 flex flex-wrap gap-2">{delivery.filePaths.map((path) => <Button key={path} size="sm" variant="outline" disabled={downloadingPath === path} onClick={() => void download(path)}><Download className="size-4" />{downloadingPath === path ? 'Liberando...' : fileName(path)}</Button>)}</div>}
                        </div>
                      ) : <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="size-4" />Aguardando entrega do prestador.</p>}
                    </div>
                  );
                })}
              </div>

              {['active','delivery_submitted','revision_requested'].includes(contract.status) && <div className="mt-5 flex justify-end border-t border-white/8 pt-5"><Button variant="outline" className="text-amber-200" onClick={() => setDisputeContract(contract)}><ShieldAlert className="size-4" />Abrir disputa</Button></div>}
            </section>
          ))}
        </div>
      )}

      <Dialog open={Boolean(disputeContract)} onOpenChange={(open) => !open && setDisputeContract(null)}>
        <DialogContent><DialogHeader><DialogTitle>Abrir disputa</DialogTitle><DialogDescription>Informe o motivo. O valor continuará reservado até a decisão administrativa.</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label htmlFor="service-dispute-reason">Motivo</Label><Input id="service-dispute-reason" value={reason} onChange={(event) => setReason(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="service-dispute-description">Descrição</Label><Textarea id="service-dispute-description" rows={6} value={description} onChange={(event) => setDescription(event.target.value)} /></div></div><DialogFooter><Button variant="outline" onClick={() => setDisputeContract(null)}>Cancelar</Button><Button variant="destructive" disabled={reason.trim().length < 3 || description.trim().length < 10 || disputeMutation.isPending} onClick={() => disputeMutation.mutate()}>{disputeMutation.isPending ? 'Abrindo...' : 'Confirmar disputa'}</Button></DialogFooter></DialogContent>
      </Dialog>
    </StudentLayout>
  );
};

export default StudentServicesWithDownloadsPage;
