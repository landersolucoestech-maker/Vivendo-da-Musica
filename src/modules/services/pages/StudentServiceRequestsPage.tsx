import { useState } from 'react';
import { CalendarDays, Eye, Plus, Send, XCircle } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import StudentLayout from '@/app/layouts/StudentLayout';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { canonicalCheckoutService } from '@/modules/checkout/services/canonicalCheckout.service';
import { serviceCatalogManagementService } from '@/modules/services/services/serviceCatalogManagement.service';
import { serviceRequestsService, type ServiceRequestItem } from '@/modules/services/services/serviceRequests.service';
import EmptyState from '@/shared/components/EmptyState';
import ErrorState from '@/shared/components/ErrorState';
import PageHeader from '@/shared/components/PageHeader';
import StatusBadge from '@/shared/components/StatusBadge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { useToast } from '@/shared/hooks/use-toast';
import { getDevIdentityId } from '@/shared/utils/devIdentity';
import { formatPrice } from '@/shared/utils/formatters';

interface RequestDraft {
  categoryId: string;
  title: string;
  brief: string;
  budgetMin: string;
  budgetMax: string;
  desiredDeliveryDate: string;
}

const requestStatusLabels: Record<ServiceRequestItem['status'], string> = {
  open: 'Aberta',
  proposal_selected: 'Proposta selecionada',
  contracted: 'Contratada',
  closed: 'Encerrada',
  canceled: 'Cancelada',
};

const StudentServiceRequestsPage = () => {
  const { user } = useAuthContext();
  const studentId = user?.id ?? getDevIdentityId('student');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [draft, setDraft] = useState<RequestDraft | null>(null);
  const [viewing, setViewing] = useState<ServiceRequestItem | null>(null);
  const [pendingCancel, setPendingCancel] = useState<ServiceRequestItem | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ['service-request-categories'],
    queryFn: () => serviceCatalogManagementService.listCategories(),
  });
  const requestsQuery = useQuery({
    queryKey: ['student-service-requests', studentId],
    queryFn: () => serviceRequestsService.listClientRequests(studentId),
  });

  const refresh = async () => queryClient.invalidateQueries({ queryKey: ['student-service-requests', studentId] });

  const createMutation = useMutation({
    mutationFn: async (input: RequestDraft) => {
      const budgetMinCents = Math.round(Number(input.budgetMin.replace(',', '.') || 0) * 100);
      const budgetMaxCents = Math.round(Number(input.budgetMax.replace(',', '.') || 0) * 100);
      if (!Number.isFinite(budgetMinCents) || !Number.isFinite(budgetMaxCents)) throw new Error('Informe valores de orçamento válidos.');
      return serviceRequestsService.createRequest({
        actingUserId: studentId,
        categoryId: input.categoryId,
        title: input.title,
        brief: input.brief,
        budgetMinCents,
        budgetMaxCents,
        currency: 'BRL',
        desiredDeliveryDate: input.desiredDeliveryDate || undefined,
      });
    },
    onSuccess: async () => {
      setDraft(null);
      await refresh();
      toast({ title: 'Solicitação publicada', description: 'Prestadores habilitados já podem enviar propostas.' });
    },
    onError: (error) => toast({ title: 'Solicitação não criada', description: error instanceof Error ? error.message : 'Tente novamente.', variant: 'destructive' }),
  });

  const cancelMutation = useMutation({
    mutationFn: (requestId: string) => serviceRequestsService.cancelRequest(studentId, requestId),
    onSuccess: async () => {
      setPendingCancel(null);
      setViewing(null);
      await refresh();
      toast({ title: 'Solicitação cancelada' });
    },
    onError: (error) => toast({ title: 'Cancelamento não realizado', description: error instanceof Error ? error.message : 'Tente novamente.', variant: 'destructive' }),
  });

  const acceptMutation = useMutation({
    mutationFn: async ({ requestId, proposalId }: { requestId: string; proposalId: string }) => {
      const offerId = await serviceRequestsService.acceptProposal(studentId, requestId, proposalId);
      return canonicalCheckoutService.createCheckout(
        [offerId],
        { serviceRequestId: requestId, proposalId },
        '/pagamento-sucesso',
        '/aluno/solicitacoes-servico',
      );
    },
    onSuccess: (checkoutUrl) => window.location.assign(checkoutUrl),
    onError: (error) => toast({ title: 'Proposta não aceita', description: error instanceof Error ? error.message : 'Tente novamente.', variant: 'destructive' }),
  });

  const categories = categoriesQuery.data ?? [];
  const requests = requestsQuery.data ?? [];
  const loadError = categoriesQuery.error ?? requestsQuery.error;

  const openForm = () => setDraft({
    categoryId: categories[0]?.id ?? '',
    title: '',
    brief: '',
    budgetMin: '',
    budgetMax: '',
    desiredDeliveryDate: '',
  });

  const budgetLabel = (request: ServiceRequestItem) => (
    `${request.budgetMinCents !== null ? formatPrice(request.budgetMinCents, request.currency) : 'aberto'}${request.budgetMaxCents !== null ? ` a ${formatPrice(request.budgetMaxCents, request.currency)}` : ''}`
  );

  return (
    <StudentLayout>
      <PageHeader
        title="Solicitações de serviço"
        subtitle="Crie briefings em popup e visualize propostas sem expor formulários diretamente na página."
        actions={<Button onClick={openForm} disabled={!categories.length}><Plus className="mr-2 size-4" />Nova solicitação</Button>}
      />

      {loadError ? (
        <ErrorState description={loadError instanceof Error ? loadError.message : 'Não foi possível carregar as solicitações.'} onRetry={() => void requestsQuery.refetch()} />
      ) : requests.length === 0 && !requestsQuery.isLoading ? (
        <EmptyState title="Nenhuma solicitação publicada" description="Crie um briefing para receber propostas personalizadas de prestadores da plataforma." actionLabel="Criar solicitação" onAction={openForm} />
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <article key={request.id} className="rounded-2xl border border-white/10 bg-card/50 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-lg font-semibold text-white">{request.title}</h2>
                    <StatusBadge status={request.status} label={requestStatusLabels[request.status]} />
                    {request.categoryName && <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-muted-foreground">{request.categoryName}</span>}
                  </div>
                  <p className="mt-3 line-clamp-2 max-w-4xl text-sm leading-6 text-muted-foreground">{request.brief}</p>
                  <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>Orçamento: {budgetLabel(request)}</span>
                    <span>{request.proposals.length} proposta(s)</span>
                    {request.desiredDeliveryDate && <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" />Entrega desejada: {new Date(`${request.desiredDeliveryDate}T12:00:00`).toLocaleDateString('pt-BR')}</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setViewing(request)}><Eye className="mr-2 size-4" />Visualizar</Button>
                  {request.status === 'open' && <Button size="sm" variant="outline" onClick={() => setPendingCancel(request)}><XCircle className="mr-2 size-4" />Cancelar</Button>}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>Nova solicitação de serviço</DialogTitle><DialogDescription>O briefing ficará visível para prestadores habilitados enquanto a solicitação estiver aberta.</DialogDescription></DialogHeader>
          {draft && <div className="space-y-4">
            <div className="space-y-2"><Label htmlFor="request-category">Categoria</Label><select id="request-category" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={draft.categoryId} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
            <div className="space-y-2"><Label htmlFor="request-title">Título do projeto</Label><Input id="request-title" value={draft.title} maxLength={140} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="request-brief">Briefing completo</Label><Textarea id="request-brief" rows={8} value={draft.brief} onChange={(event) => setDraft({ ...draft, brief: event.target.value })} /></div>
            <div className="grid gap-4 sm:grid-cols-3"><div className="space-y-2"><Label htmlFor="request-budget-min">Orçamento mínimo</Label><Input id="request-budget-min" type="number" min="0" step="0.01" value={draft.budgetMin} onChange={(event) => setDraft({ ...draft, budgetMin: event.target.value })} /></div><div className="space-y-2"><Label htmlFor="request-budget-max">Orçamento máximo</Label><Input id="request-budget-max" type="number" min="0" step="0.01" value={draft.budgetMax} onChange={(event) => setDraft({ ...draft, budgetMax: event.target.value })} /></div><div className="space-y-2"><Label htmlFor="request-date">Entrega desejada</Label><Input id="request-date" type="date" value={draft.desiredDeliveryDate} onChange={(event) => setDraft({ ...draft, desiredDeliveryDate: event.target.value })} /></div></div>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setDraft(null)}>Cancelar</Button><Button disabled={!draft || !draft.categoryId || draft.title.trim().length < 3 || draft.brief.trim().length < 20 || createMutation.isPending} onClick={() => draft && createMutation.mutate(draft)}>{createMutation.isPending ? 'Publicando...' : 'Publicar solicitação'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewing)} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>Visualizar solicitação</DialogTitle><DialogDescription>Briefing, orçamento, prazo e propostas recebidas.</DialogDescription></DialogHeader>
          {viewing && (
            <div className="space-y-6">
              <div className="grid gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:grid-cols-2">
                <div><p className="text-xs text-muted-foreground">Título</p><p className="mt-1 font-semibold text-white">{viewing.title}</p></div>
                <div><p className="text-xs text-muted-foreground">Categoria</p><p className="mt-1 text-white">{viewing.categoryName || 'Não informada'}</p></div>
                <div><p className="text-xs text-muted-foreground">Status</p><div className="mt-1"><StatusBadge status={viewing.status} label={requestStatusLabels[viewing.status]} /></div></div>
                <div><p className="text-xs text-muted-foreground">Orçamento</p><p className="mt-1 text-white">{budgetLabel(viewing)}</p></div>
                <div><p className="text-xs text-muted-foreground">Entrega desejada</p><p className="mt-1 text-white">{viewing.desiredDeliveryDate ? new Date(`${viewing.desiredDeliveryDate}T12:00:00`).toLocaleDateString('pt-BR') : 'Sem data definida'}</p></div>
                <div><p className="text-xs text-muted-foreground">Propostas</p><p className="mt-1 text-white">{viewing.proposals.length}</p></div>
              </div>
              <div><p className="text-xs text-muted-foreground">Briefing</p><p className="mt-2 whitespace-pre-line text-sm leading-6 text-white">{viewing.brief}</p></div>
              <section className="border-t border-white/10 pt-5">
                <h3 className="text-sm font-semibold text-white">Propostas recebidas ({viewing.proposals.length})</h3>
                <div className="mt-3 grid gap-3">
                  {viewing.proposals.map((proposal) => (
                    <div key={proposal.id} className="rounded-xl border border-white/10 bg-black/15 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-medium text-white">{proposal.providerName}</p><p className="mt-1 text-xs text-muted-foreground">{proposal.deliveryDays} dias · {proposal.revisions} revisões</p></div><p className="font-display text-lg font-bold text-primary">{formatPrice(proposal.amountCents, proposal.currency)}</p></div>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">{proposal.scope}</p>
                      {!!proposal.deliverables.length && <ul className="mt-3 list-inside list-disc text-xs leading-5 text-muted-foreground">{proposal.deliverables.map((item) => <li key={item}>{item}</li>)}</ul>}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><StatusBadge status={proposal.status} label={proposal.status === 'submitted' ? 'Disponível' : proposal.status} />{viewing.status === 'open' && proposal.status === 'submitted' && <Button size="sm" disabled={acceptMutation.isPending} onClick={() => acceptMutation.mutate({ requestId: viewing.id, proposalId: proposal.id })}><Send className="mr-2 size-4" />Aceitar e pagar</Button>}</div>
                    </div>
                  ))}
                  {viewing.proposals.length === 0 && <p className="text-sm text-muted-foreground">Ainda não há propostas para este briefing.</p>}
                </div>
              </section>
            </div>
          )}
          <DialogFooter>
            {viewing?.status === 'open' && <Button variant="outline" onClick={() => setPendingCancel(viewing)}><XCircle className="size-4" />Cancelar solicitação</Button>}
            <Button onClick={() => setViewing(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(pendingCancel)} onOpenChange={(open) => !open && setPendingCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar solicitação?</AlertDialogTitle>
            <AlertDialogDescription>A solicitação “{pendingCancel?.title}” deixará de aceitar novas propostas. Esta ação não inicia reembolso automático de eventual contratação.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMutation.isPending}>Manter solicitação</AlertDialogCancel>
            <AlertDialogAction disabled={cancelMutation.isPending} onClick={(event) => { event.preventDefault(); if (pendingCancel) cancelMutation.mutate(pendingCancel.id); }}>
              {cancelMutation.isPending ? 'Cancelando...' : 'Confirmar cancelamento'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </StudentLayout>
  );
};

export default StudentServiceRequestsPage;
