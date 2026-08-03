import { useMemo, useState } from 'react';
import { Archive, PackagePlus, Pencil, Plus, Send } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import ProducerLayout from '@/app/layouts/ProducerLayout';
import { useAuthContext } from '@/app/providers/AuthProvider';
import {
  serviceCatalogManagementService,
  type ManagedServiceListing,
  type ManagedServicePackage,
} from '@/modules/services/services/serviceCatalogManagement.service';
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

interface ListingDraft {
  id?: string;
  categoryId: string;
  title: string;
  shortDescription: string;
  description: string;
  requirements: string;
}

interface PackageDraft {
  listingId: string;
  id?: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  deliveryDays: string;
  revisions: string;
  deliverables: string;
  active: boolean;
}

const moderationLabels: Record<ManagedServiceListing['moderationStatus'], string> = {
  pending: 'Aguardando análise',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
};

const statusLabels: Record<ManagedServiceListing['status'], string> = {
  draft: 'Rascunho',
  published: 'Publicado',
  paused: 'Pausado',
  archived: 'Arquivado',
};

const splitLines = (value: string) => value.split('\n').map((item) => item.trim()).filter(Boolean);

const ProducerServiceCatalogPage = () => {
  const { user } = useAuthContext();
  const providerId = user?.id ?? getDevIdentityId('producer');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [listingDraft, setListingDraft] = useState<ListingDraft | null>(null);
  const [packageDraft, setPackageDraft] = useState<PackageDraft | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ['service-categories-management'],
    queryFn: () => serviceCatalogManagementService.listCategories(),
  });
  const listingsQuery = useQuery({
    queryKey: ['provider-service-catalog', providerId],
    queryFn: () => serviceCatalogManagementService.listProviderListings(providerId),
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['provider-service-catalog', providerId] }),
      queryClient.invalidateQueries({ queryKey: ['public-services'] }),
    ]);
  };

  const saveListingMutation = useMutation({
    mutationFn: async (draft: ListingDraft) => serviceCatalogManagementService.saveListing({
      actingUserId: providerId,
      listingId: draft.id,
      categoryId: draft.categoryId,
      title: draft.title,
      shortDescription: draft.shortDescription,
      description: draft.description,
      requirements: splitLines(draft.requirements),
    }),
    onSuccess: async () => {
      setListingDraft(null);
      await refresh();
      toast({ title: 'Serviço salvo', description: 'As alterações ficaram em rascunho para nova análise.' });
    },
    onError: (error) => toast({ title: 'Não foi possível salvar', description: error instanceof Error ? error.message : 'Tente novamente.', variant: 'destructive' }),
  });

  const savePackageMutation = useMutation({
    mutationFn: async (draft: PackageDraft) => {
      const priceCents = Math.round(Number(draft.price.replace(',', '.')) * 100);
      const deliveryDays = Number(draft.deliveryDays);
      const revisions = Number(draft.revisions);
      if (!Number.isFinite(priceCents) || priceCents < 0) throw new Error('Informe um preço válido.');
      if (!Number.isInteger(deliveryDays) || deliveryDays <= 0) throw new Error('Informe um prazo válido.');
      if (!Number.isInteger(revisions) || revisions < 0) throw new Error('Informe uma quantidade válida de revisões.');
      return serviceCatalogManagementService.savePackage({
        actingUserId: providerId,
        listingId: draft.listingId,
        packageId: draft.id,
        packageName: draft.name,
        packageDescription: draft.description,
        priceCents,
        currency: draft.currency,
        deliveryDays,
        revisions,
        deliverables: splitLines(draft.deliverables),
        active: draft.active,
      });
    },
    onSuccess: async () => {
      setPackageDraft(null);
      await refresh();
      toast({ title: 'Pacote salvo', description: 'O preço foi versionado na oferta comercial.' });
    },
    onError: (error) => toast({ title: 'Não foi possível salvar o pacote', description: error instanceof Error ? error.message : 'Tente novamente.', variant: 'destructive' }),
  });

  const submitMutation = useMutation({
    mutationFn: (listingId: string) => serviceCatalogManagementService.submitListing(providerId, listingId),
    onSuccess: async () => { await refresh(); toast({ title: 'Serviço enviado para análise' }); },
    onError: (error) => toast({ title: 'Envio não realizado', description: error instanceof Error ? error.message : 'Tente novamente.', variant: 'destructive' }),
  });

  const archiveMutation = useMutation({
    mutationFn: (listingId: string) => serviceCatalogManagementService.archiveListing(providerId, listingId),
    onSuccess: async () => { await refresh(); toast({ title: 'Serviço arquivado' }); },
    onError: (error) => toast({ title: 'Arquivamento não realizado', description: error instanceof Error ? error.message : 'Tente novamente.', variant: 'destructive' }),
  });

  const categories = categoriesQuery.data ?? [];
  const listings = listingsQuery.data ?? [];
  const isLoading = categoriesQuery.isLoading || listingsQuery.isLoading;
  const loadError = categoriesQuery.error ?? listingsQuery.error;

  const defaultCategoryId = useMemo(() => categories[0]?.id ?? '', [categories]);

  const openNewListing = () => setListingDraft({
    categoryId: defaultCategoryId,
    title: '',
    shortDescription: '',
    description: '',
    requirements: '',
  });

  const openListing = (listing: ManagedServiceListing) => setListingDraft({
    id: listing.id,
    categoryId: listing.categoryId,
    title: listing.title,
    shortDescription: listing.shortDescription ?? '',
    description: listing.description,
    requirements: listing.requirements.join('\n'),
  });

  const openPackage = (listingId: string, servicePackage?: ManagedServicePackage) => setPackageDraft({
    listingId,
    id: servicePackage?.id,
    name: servicePackage?.name ?? '',
    description: servicePackage?.description ?? '',
    price: servicePackage ? (servicePackage.priceCents / 100).toFixed(2) : '',
    currency: servicePackage?.currency ?? 'BRL',
    deliveryDays: String(servicePackage?.deliveryDays ?? 7),
    revisions: String(servicePackage?.revisions ?? 1),
    deliverables: servicePackage?.deliverables.join('\n') ?? '',
    active: servicePackage?.active ?? true,
  });

  return (
    <ProducerLayout>
      <PageHeader
        title="Catálogo de serviços"
        subtitle="Crie seus serviços, defina pacotes e envie o anúncio para moderação."
        actions={<Button onClick={openNewListing} disabled={!defaultCategoryId}><Plus className="mr-2 size-4" />Novo serviço</Button>}
      />

      {loadError ? (
        <ErrorState description={loadError instanceof Error ? loadError.message : 'Não foi possível carregar o catálogo.'} onRetry={() => void listingsQuery.refetch()} />
      ) : listings.length === 0 && !isLoading ? (
        <EmptyState title="Nenhum serviço cadastrado" description="Cadastre o primeiro anúncio e adicione ao menos um pacote antes de enviá-lo para análise." actionLabel="Criar serviço" onAction={openNewListing} />
      ) : (
        <div className="space-y-5">
          {listings.map((listing) => (
            <article key={listing.id} className="rounded-2xl border border-white/10 bg-card/50 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-lg font-semibold text-white">{listing.title}</h2>
                    <StatusBadge status={listing.status} label={statusLabels[listing.status]} />
                    <StatusBadge status={listing.moderationStatus} label={moderationLabels[listing.moderationStatus]} />
                  </div>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{listing.shortDescription || listing.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openListing(listing)}><Pencil className="mr-2 size-4" />Editar</Button>
                  <Button size="sm" variant="outline" onClick={() => openPackage(listing.id)}><PackagePlus className="mr-2 size-4" />Novo pacote</Button>
                  {listing.status !== 'archived' && (
                    <Button size="sm" variant="outline" disabled={submitMutation.isPending || listing.packages.length === 0} onClick={() => submitMutation.mutate(listing.id)}><Send className="mr-2 size-4" />Enviar para análise</Button>
                  )}
                  {listing.status !== 'archived' && (
                    <Button size="sm" variant="ghost" disabled={archiveMutation.isPending} onClick={() => archiveMutation.mutate(listing.id)}><Archive className="mr-2 size-4" />Arquivar</Button>
                  )}
                </div>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-3">
                {listing.packages.map((servicePackage) => (
                  <button key={servicePackage.id} type="button" onClick={() => openPackage(listing.id, servicePackage)} className="rounded-xl border border-white/10 bg-black/15 p-4 text-left transition hover:border-primary/40">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="font-medium text-white">{servicePackage.name}</p><p className="mt-1 text-xs text-muted-foreground">{servicePackage.deliveryDays} dias · {servicePackage.revisions} revisões</p></div>
                      <span className="font-semibold text-primary">{formatPrice(servicePackage.priceCents, servicePackage.currency)}</span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{servicePackage.description || servicePackage.deliverables.join(', ') || 'Pacote sem descrição.'}</p>
                  </button>
                ))}
                {listing.packages.length === 0 && <p className="text-sm text-amber-200">Cadastre ao menos um pacote para enviar este serviço à moderação.</p>}
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={Boolean(listingDraft)} onOpenChange={(open) => !open && setListingDraft(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{listingDraft?.id ? 'Editar serviço' : 'Novo serviço'}</DialogTitle><DialogDescription>Alterar um serviço publicado envia o anúncio novamente para análise.</DialogDescription></DialogHeader>
          {listingDraft && (
            <div className="space-y-4">
              <div className="space-y-2"><Label htmlFor="service-category">Categoria</Label><select id="service-category" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={listingDraft.categoryId} onChange={(event) => setListingDraft({ ...listingDraft, categoryId: event.target.value })}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
              <div className="space-y-2"><Label htmlFor="service-title">Título</Label><Input id="service-title" value={listingDraft.title} maxLength={140} onChange={(event) => setListingDraft({ ...listingDraft, title: event.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="service-summary">Resumo</Label><Input id="service-summary" value={listingDraft.shortDescription} maxLength={280} onChange={(event) => setListingDraft({ ...listingDraft, shortDescription: event.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="service-description">Descrição completa</Label><Textarea id="service-description" rows={8} value={listingDraft.description} onChange={(event) => setListingDraft({ ...listingDraft, description: event.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="service-requirements">O que o cliente precisa enviar</Label><Textarea id="service-requirements" rows={4} placeholder="Um requisito por linha" value={listingDraft.requirements} onChange={(event) => setListingDraft({ ...listingDraft, requirements: event.target.value })} /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setListingDraft(null)}>Cancelar</Button><Button disabled={!listingDraft || listingDraft.title.trim().length < 3 || listingDraft.description.trim().length < 20 || !listingDraft.categoryId || saveListingMutation.isPending} onClick={() => listingDraft && saveListingMutation.mutate(listingDraft)}>{saveListingMutation.isPending ? 'Salvando...' : 'Salvar serviço'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(packageDraft)} onOpenChange={(open) => !open && setPackageDraft(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>{packageDraft?.id ? 'Editar pacote' : 'Novo pacote'}</DialogTitle><DialogDescription>Preço, prazo e entregáveis ficarão registrados na versão comercial da oferta.</DialogDescription></DialogHeader>
          {packageDraft && (
            <div className="space-y-4">
              <div className="space-y-2"><Label htmlFor="package-name">Nome</Label><Input id="package-name" value={packageDraft.name} onChange={(event) => setPackageDraft({ ...packageDraft, name: event.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="package-description">Descrição</Label><Textarea id="package-description" rows={4} value={packageDraft.description} onChange={(event) => setPackageDraft({ ...packageDraft, description: event.target.value })} /></div>
              <div className="grid gap-4 sm:grid-cols-3"><div className="space-y-2"><Label htmlFor="package-price">Preço</Label><Input id="package-price" type="number" min="0" step="0.01" value={packageDraft.price} onChange={(event) => setPackageDraft({ ...packageDraft, price: event.target.value })} /></div><div className="space-y-2"><Label htmlFor="package-days">Prazo em dias</Label><Input id="package-days" type="number" min="1" value={packageDraft.deliveryDays} onChange={(event) => setPackageDraft({ ...packageDraft, deliveryDays: event.target.value })} /></div><div className="space-y-2"><Label htmlFor="package-revisions">Revisões</Label><Input id="package-revisions" type="number" min="0" value={packageDraft.revisions} onChange={(event) => setPackageDraft({ ...packageDraft, revisions: event.target.value })} /></div></div>
              <div className="space-y-2"><Label htmlFor="package-deliverables">Entregáveis</Label><Textarea id="package-deliverables" rows={5} placeholder="Um entregável por linha" value={packageDraft.deliverables} onChange={(event) => setPackageDraft({ ...packageDraft, deliverables: event.target.value })} /></div>
              <label className="flex items-center gap-2 text-sm text-white"><input type="checkbox" checked={packageDraft.active} onChange={(event) => setPackageDraft({ ...packageDraft, active: event.target.checked })} />Pacote ativo</label>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setPackageDraft(null)}>Cancelar</Button><Button disabled={!packageDraft || packageDraft.name.trim().length < 2 || savePackageMutation.isPending} onClick={() => packageDraft && savePackageMutation.mutate(packageDraft)}>{savePackageMutation.isPending ? 'Salvando...' : 'Salvar pacote'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </ProducerLayout>
  );
};

export default ProducerServiceCatalogPage;
