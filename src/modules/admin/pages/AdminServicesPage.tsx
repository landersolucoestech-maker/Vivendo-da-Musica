import { useMemo, useState } from 'react';
import { BriefcaseBusiness, CheckCircle2, Clock3, Scale, XCircle } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import AdminLayout from '@/app/layouts/AdminLayout';
import {
  adminServicesService,
  type AdminServiceDispute,
  type AdminServiceListing,
} from '@/modules/admin/services/adminServices.service';
import EmptyState from '@/shared/components/EmptyState';
import ErrorState from '@/shared/components/ErrorState';
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

interface ReviewDraft {
  listing: AdminServiceListing;
  status: 'approved' | 'rejected';
  reason: string;
}

interface ResolutionDraft {
  dispute: AdminServiceDispute;
  status: 'resolved_buyer' | 'resolved_provider' | 'resolved_split';
  refund: string;
  resolution: string;
}

const moderationLabels: Record<AdminServiceListing['moderationStatus'], string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
};

const disputeLabels: Record<AdminServiceDispute['status'], string> = {
  open: 'Aberta',
  under_review: 'Em análise',
  resolved_buyer: 'Resolvida para cliente',
  resolved_provider: 'Resolvida para prestador',
  resolved_split: 'Resolvida com divisão',
  closed: 'Encerrada',
};

const AdminServicesPage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [review, setReview] = useState<ReviewDraft | null>(null);
  const [resolution, setResolution] = useState<ResolutionDraft | null>(null);

  const listingsQuery = useQuery({
    queryKey: ['admin-service-listings'],
    queryFn: () => adminServicesService.listListings(),
  });
  const disputesQuery = useQuery({
    queryKey: ['admin-service-disputes'],
    queryFn: () => adminServicesService.listDisputes(),
  });

  const refresh = async () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['admin-service-listings'] }),
    queryClient.invalidateQueries({ queryKey: ['admin-service-disputes'] }),
    queryClient.invalidateQueries({ queryKey: ['public-services'] }),
  ]);

  const reviewMutation = useMutation({
    mutationFn: (input: ReviewDraft) => adminServicesService.reviewListing(input.listing, input.status, input.reason),
    onSuccess: async () => {
      const status = review?.status;
      setReview(null);
      await refresh();
      toast({ title: status === 'approved' ? 'Serviço aprovado' : 'Serviço rejeitado', description: 'A situação das ofertas comerciais foi atualizada junto com a moderação.' });
    },
    onError: (error) => toast({ title: 'Decisão não registrada', description: error instanceof Error ? error.message : 'Tente novamente.', variant: 'destructive' }),
  });

  const resolutionMutation = useMutation({
    mutationFn: async (input: ResolutionDraft) => {
      const refundCents = input.status === 'resolved_split'
        ? Math.round(Number(input.refund.replace(',', '.')) * 100)
        : input.status === 'resolved_buyer' ? input.dispute.contractTotalCents : 0;
      if (!Number.isFinite(refundCents) || refundCents < 0 || refundCents > input.dispute.contractTotalCents) throw new Error('Valor de reembolso inválido.');
      await adminServicesService.resolveDispute(input.dispute, input.status, refundCents, input.resolution);
    },
    onSuccess: async () => {
      setResolution(null);
      await refresh();
      toast({ title: 'Disputa resolvida', description: 'Contrato, entitlement, split e ledger foram atualizados de forma atômica.' });
    },
    onError: (error) => toast({ title: 'Disputa não resolvida', description: error instanceof Error ? error.message : 'Tente novamente.', variant: 'destructive' }),
  });

  const listings = listingsQuery.data ?? [];
  const disputes = disputesQuery.data ?? [];
  const pendingListings = useMemo(() => listings.filter((item) => item.moderationStatus === 'pending'), [listings]);
  const openDisputes = useMemo(() => disputes.filter((item) => item.status === 'open' || item.status === 'under_review'), [disputes]);
  const loadError = listingsQuery.error ?? disputesQuery.error;

  return (
    <AdminLayout>
      <PageHeader title="Serviços e disputas" subtitle="Moderação do catálogo, ofertas comerciais e resolução financeira dos contratos de serviço." />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Serviços cadastrados" value={String(listings.length)} icon={BriefcaseBusiness} />
        <StatCard label="Aguardando análise" value={String(pendingListings.length)} icon={Clock3} />
        <StatCard label="Serviços aprovados" value={String(listings.filter((item) => item.moderationStatus === 'approved').length)} icon={CheckCircle2} />
        <StatCard label="Disputas abertas" value={String(openDisputes.length)} icon={Scale} />
      </div>

      {loadError ? (
        <ErrorState description={loadError instanceof Error ? loadError.message : 'Não foi possível carregar a gestão de serviços.'} onRetry={() => void listingsQuery.refetch()} />
      ) : (
        <div className="space-y-10">
          <section>
            <div className="mb-4"><h2 className="font-display text-xl font-semibold text-white">Fila de moderação</h2><p className="mt-1 text-sm text-muted-foreground">A aprovação publica o anúncio e ativa as ofertas dos pacotes. A rejeição devolve o anúncio para rascunho.</p></div>
            <div className="space-y-4">
              {listings.map((listing) => (
                <article key={listing.id} className="rounded-2xl border border-white/10 bg-card/50 p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-lg font-semibold text-white">{listing.title}</h3><StatusBadge status={listing.moderationStatus} label={moderationLabels[listing.moderationStatus]} />{listing.categoryName && <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-muted-foreground">{listing.categoryName}</span>}</div>
                      <p className="mt-2 text-sm text-muted-foreground">Prestador: {listing.providerName} · Atualizado em {new Date(listing.updatedAt).toLocaleString('pt-BR')}</p>
                      <div className="mt-4 flex flex-wrap gap-2">{listing.packages.map((item) => <span key={item.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-muted-foreground"><strong className="text-white">{item.name}</strong> · {formatPrice(item.priceCents, item.currency)} · {item.active ? 'ativo' : 'inativo'}</span>)}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" disabled={reviewMutation.isPending || listing.packages.filter((item) => item.active).length === 0} onClick={() => setReview({ listing, status: 'approved', reason: '' })}><CheckCircle2 className="mr-2 size-4" />Aprovar</Button>
                      <Button size="sm" variant="outline" disabled={reviewMutation.isPending} onClick={() => setReview({ listing, status: 'rejected', reason: '' })}><XCircle className="mr-2 size-4" />Rejeitar</Button>
                    </div>
                  </div>
                </article>
              ))}
              {!listings.length && <EmptyState title="Nenhum serviço cadastrado" description="Os anúncios enviados pelos prestadores aparecerão nesta fila." />}
            </div>
          </section>

          <section>
            <div className="mb-4"><h2 className="font-display text-xl font-semibold text-white">Disputas de contratos</h2><p className="mt-1 text-sm text-muted-foreground">A resolução pode reembolsar o cliente, liberar o prestador ou dividir o valor.</p></div>
            <div className="space-y-4">
              {disputes.map((dispute) => (
                <article key={dispute.id} className="rounded-2xl border border-white/10 bg-card/50 p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-lg font-semibold text-white">{dispute.contractTitle}</h3><StatusBadge status={dispute.status} label={disputeLabels[dispute.status]} /></div>
                      <p className="mt-2 text-sm text-muted-foreground">Contrato: {dispute.contractId.slice(0, 8)} · Valor: {formatPrice(dispute.contractTotalCents, dispute.currency)} · Aberta em {new Date(dispute.createdAt).toLocaleString('pt-BR')}</p>
                      <p className="mt-4 text-sm font-medium text-white">{dispute.reason}</p><p className="mt-1 max-w-4xl whitespace-pre-line text-sm leading-6 text-muted-foreground">{dispute.description}</p>
                      {dispute.resolution && <p className="mt-4 rounded-xl border border-white/10 bg-black/15 p-3 text-sm text-muted-foreground"><strong className="text-white">Resolução:</strong> {dispute.resolution}</p>}
                    </div>
                    {(dispute.status === 'open' || dispute.status === 'under_review') && <Button size="sm" onClick={() => setResolution({ dispute, status: 'resolved_buyer', refund: (dispute.contractTotalCents / 100).toFixed(2), resolution: '' })}><Scale className="mr-2 size-4" />Resolver</Button>}
                  </div>
                </article>
              ))}
              {!disputes.length && <EmptyState title="Nenhuma disputa registrada" description="Contratos contestados aparecerão aqui para análise e resolução financeira." />}
            </div>
          </section>
        </div>
      )}

      <Dialog open={Boolean(review)} onOpenChange={(open) => !open && setReview(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{review?.status === 'approved' ? 'Aprovar serviço' : 'Rejeitar serviço'}</DialogTitle><DialogDescription>{review?.listing.title}</DialogDescription></DialogHeader>
          {review && <div className="space-y-2"><Label htmlFor="moderation-reason">Parecer da moderação</Label><Textarea id="moderation-reason" rows={5} value={review.reason} onChange={(event) => setReview({ ...review, reason: event.target.value })} placeholder={review.status === 'approved' ? 'Observação opcional' : 'Explique o que precisa ser corrigido'} /></div>}
          <DialogFooter><Button variant="outline" onClick={() => setReview(null)}>Cancelar</Button><Button variant={review?.status === 'rejected' ? 'destructive' : 'default'} disabled={!review || (review.status === 'rejected' && review.reason.trim().length < 5) || reviewMutation.isPending} onClick={() => review && reviewMutation.mutate(review)}>{reviewMutation.isPending ? 'Registrando...' : 'Confirmar decisão'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(resolution)} onOpenChange={(open) => !open && setResolution(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Resolver disputa</DialogTitle><DialogDescription>{resolution?.dispute.contractTitle}</DialogDescription></DialogHeader>
          {resolution && <div className="space-y-4">
            <div className="space-y-2"><Label htmlFor="resolution-type">Resultado</Label><select id="resolution-type" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={resolution.status} onChange={(event) => { const status = event.target.value as ResolutionDraft['status']; setResolution({ ...resolution, status, refund: status === 'resolved_buyer' ? (resolution.dispute.contractTotalCents / 100).toFixed(2) : status === 'resolved_provider' ? '0.00' : resolution.refund }); }}><option value="resolved_buyer">Reembolso integral ao cliente</option><option value="resolved_provider">Liberação integral ao prestador</option><option value="resolved_split">Reembolso parcial / divisão</option></select></div>
            {resolution.status === 'resolved_split' && <div className="space-y-2"><Label htmlFor="resolution-refund">Valor reembolsado ao cliente</Label><Input id="resolution-refund" type="number" min="0" max={resolution.dispute.contractTotalCents / 100} step="0.01" value={resolution.refund} onChange={(event) => setResolution({ ...resolution, refund: event.target.value })} /></div>}
            <div className="space-y-2"><Label htmlFor="resolution-notes">Fundamentação</Label><Textarea id="resolution-notes" rows={7} value={resolution.resolution} onChange={(event) => setResolution({ ...resolution, resolution: event.target.value })} /></div>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setResolution(null)}>Cancelar</Button><Button disabled={!resolution || resolution.resolution.trim().length < 10 || resolutionMutation.isPending} onClick={() => resolution && resolutionMutation.mutate(resolution)}>{resolutionMutation.isPending ? 'Resolvendo...' : 'Confirmar resolução'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminServicesPage;
