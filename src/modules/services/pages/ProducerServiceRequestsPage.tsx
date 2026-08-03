import { useState } from 'react';
import { CalendarDays, Send, Undo2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import ProducerLayout from '@/app/layouts/ProducerLayout';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { serviceRequestsService, type ServiceRequestItem } from '@/modules/services/services/serviceRequests.service';
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
import { getDevIdentityId } from '@/shared/utils/devIdentity';
import { formatPrice } from '@/shared/utils/formatters';

interface ProposalDraft {
  request: ServiceRequestItem;
  proposalId?: string;
  amount: string;
  deliveryDays: string;
  revisions: string;
  scope: string;
  deliverables: string;
}

const splitLines = (value: string) => value.split('\n').map((item) => item.trim()).filter(Boolean);

const ProducerServiceRequestsPage = () => {
  const { user } = useAuthContext();
  const providerId = user?.id ?? getDevIdentityId('producer');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [draft, setDraft] = useState<ProposalDraft | null>(null);

  const requestsQuery = useQuery({
    queryKey: ['open-service-requests'],
    queryFn: () => serviceRequestsService.listOpenRequests(),
  });

  const refresh = async () => queryClient.invalidateQueries({ queryKey: ['open-service-requests'] });

  const submitMutation = useMutation({
    mutationFn: async (input: ProposalDraft) => {
      const amountCents = Math.round(Number(input.amount.replace(',', '.')) * 100);
      const deliveryDays = Number(input.deliveryDays);
      const revisions = Number(input.revisions);
      if (!Number.isFinite(amountCents) || amountCents < 0) throw new Error('Informe um valor válido.');
      if (!Number.isInteger(deliveryDays) || deliveryDays <= 0) throw new Error('Informe um prazo válido.');
      if (!Number.isInteger(revisions) || revisions < 0) throw new Error('Informe uma quantidade válida de revisões.');
      return serviceRequestsService.submitProposal({
        actingUserId: providerId,
        requestId: input.request.id,
        amountCents,
        deliveryDays,
        revisions,
        scope: input.scope,
        deliverables: splitLines(input.deliverables),
      });
    },
    onSuccess: async () => {
      setDraft(null);
      await refresh();
      toast({ title: 'Proposta enviada', description: 'O cliente já pode selecionar sua oferta e iniciar o checkout.' });
    },
    onError: (error) => toast({ title: 'Proposta não enviada', description: error instanceof Error ? error.message : 'Tente novamente.', variant: 'destructive' }),
  });

  const withdrawMutation = useMutation({
    mutationFn: (proposalId: string) => serviceRequestsService.withdrawProposal(providerId, proposalId),
    onSuccess: async () => { await refresh(); toast({ title: 'Proposta retirada' }); },
    onError: (error) => toast({ title: 'Proposta não retirada', description: error instanceof Error ? error.message : 'Tente novamente.', variant: 'destructive' }),
  });

  const requests = requestsQuery.data ?? [];

  const openProposal = (request: ServiceRequestItem) => {
    const proposal = request.proposals.find((item) => item.providerId === providerId && item.status === 'submitted');
    setDraft({
      request,
      proposalId: proposal?.id,
      amount: proposal ? (proposal.amountCents / 100).toFixed(2) : '',
      deliveryDays: String(proposal?.deliveryDays ?? 7),
      revisions: String(proposal?.revisions ?? 1),
      scope: proposal?.scope ?? '',
      deliverables: proposal?.deliverables.join('\n') ?? '',
    });
  };

  return (
    <ProducerLayout>
      <PageHeader title="Solicitações de serviço" subtitle="Consulte briefings abertos e envie propostas personalizadas." />

      {requestsQuery.isError ? (
        <ErrorState description={requestsQuery.error.message} onRetry={() => void requestsQuery.refetch()} />
      ) : requests.length === 0 && !requestsQuery.isLoading ? (
        <EmptyState title="Nenhuma solicitação aberta" description="Os novos briefings publicados pelos clientes aparecerão aqui." />
      ) : (
        <div className="space-y-5">
          {requests.map((request) => {
            const ownProposal = request.proposals.find((proposal) => proposal.providerId === providerId);
            return (
              <article key={request.id} className="rounded-2xl border border-white/10 bg-card/50 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-lg font-semibold text-white">{request.title}</h2>{request.categoryName && <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-muted-foreground">{request.categoryName}</span>}{ownProposal && <StatusBadge status={ownProposal.status} label={ownProposal.status === 'submitted' ? 'Proposta enviada' : ownProposal.status} />}</div>
                    <p className="mt-3 max-w-4xl whitespace-pre-line text-sm leading-6 text-muted-foreground">{request.brief}</p>
                    <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span>Orçamento: {request.budgetMinCents !== null ? formatPrice(request.budgetMinCents, request.currency) : 'aberto'}{request.budgetMaxCents !== null ? ` a ${formatPrice(request.budgetMaxCents, request.currency)}` : ''}</span>
                      {request.desiredDeliveryDate && <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" />Desejado para {new Date(`${request.desiredDeliveryDate}T12:00:00`).toLocaleDateString('pt-BR')}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => openProposal(request)}><Send className="mr-2 size-4" />{ownProposal?.status === 'submitted' ? 'Editar proposta' : 'Enviar proposta'}</Button>
                    {ownProposal?.status === 'submitted' && <Button size="sm" variant="outline" disabled={withdrawMutation.isPending} onClick={() => withdrawMutation.mutate(ownProposal.id)}><Undo2 className="mr-2 size-4" />Retirar</Button>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{draft?.proposalId ? 'Editar proposta' : 'Nova proposta'}</DialogTitle><DialogDescription>{draft?.request.title}</DialogDescription></DialogHeader>
          {draft && <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3"><div className="space-y-2"><Label htmlFor="proposal-amount">Valor</Label><Input id="proposal-amount" type="number" min="0" step="0.01" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} /></div><div className="space-y-2"><Label htmlFor="proposal-days">Prazo em dias</Label><Input id="proposal-days" type="number" min="1" value={draft.deliveryDays} onChange={(event) => setDraft({ ...draft, deliveryDays: event.target.value })} /></div><div className="space-y-2"><Label htmlFor="proposal-revisions">Revisões</Label><Input id="proposal-revisions" type="number" min="0" value={draft.revisions} onChange={(event) => setDraft({ ...draft, revisions: event.target.value })} /></div></div>
            <div className="space-y-2"><Label htmlFor="proposal-scope">Escopo da proposta</Label><Textarea id="proposal-scope" rows={8} value={draft.scope} onChange={(event) => setDraft({ ...draft, scope: event.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="proposal-deliverables">Entregáveis</Label><Textarea id="proposal-deliverables" rows={5} placeholder="Um entregável por linha" value={draft.deliverables} onChange={(event) => setDraft({ ...draft, deliverables: event.target.value })} /></div>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setDraft(null)}>Cancelar</Button><Button disabled={!draft || draft.scope.trim().length < 20 || !draft.amount || submitMutation.isPending} onClick={() => draft && submitMutation.mutate(draft)}>{submitMutation.isPending ? 'Enviando...' : 'Salvar proposta'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </ProducerLayout>
  );
};

export default ProducerServiceRequestsPage;
