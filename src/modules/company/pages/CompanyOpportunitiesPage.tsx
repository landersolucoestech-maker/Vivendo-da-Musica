import { useMemo, useState } from 'react';
import { BriefcaseBusiness, CalendarClock, Coins, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import CompanyLayout from '@/app/layouts/CompanyLayout';
import {
  useCompanyCreditBalance,
  useCompanyCreditEvents,
  useCompanyCreditPacks,
  useCompanyOpportunities,
} from '@/modules/company/hooks/useCompanyPortal';
import { companyService } from '@/modules/company/services/company.service';
import type { CompanyOpportunity, CompanyOpportunityInput } from '@/modules/company/types/company.types';
import EmptyState from '@/shared/components/EmptyState';
import ErrorState from '@/shared/components/ErrorState';
import LoadingState from '@/shared/components/LoadingState';
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
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { useToast } from '@/shared/hooks/use-toast';

interface FormState {
  id?: string;
  title: string;
  kind: CompanyOpportunityInput['kind'];
  location: string;
  engagementType: string;
  workMode: CompanyOpportunityInput['workMode'];
  description: string;
  requirements: string;
  benefits: string;
  salaryMin: string;
  salaryMax: string;
  applicationDeadline: string;
}

const EMPTY_FORM: FormState = {
  title: '',
  kind: 'job',
  location: '',
  engagementType: '',
  workMode: 'onsite',
  description: '',
  requirements: '',
  benefits: '',
  salaryMin: '',
  salaryMax: '',
  applicationDeadline: '',
};

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const selectClassName = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const formatDate = (value: string | null) => value ? new Date(value).toLocaleDateString('pt-BR') : '—';

const toForm = (item: CompanyOpportunity): FormState => ({
  id: item.id,
  title: item.title,
  kind: item.kind,
  location: item.location,
  engagementType: item.engagementType,
  workMode: item.workMode,
  description: item.description,
  requirements: item.requirements.join('\n'),
  benefits: item.benefits.join('\n'),
  salaryMin: item.salaryMinCents === null ? '' : String(item.salaryMinCents / 100),
  salaryMax: item.salaryMaxCents === null ? '' : String(item.salaryMaxCents / 100),
  applicationDeadline: item.applicationDeadline ?? '',
});

const salaryLabel = (item: CompanyOpportunity) => {
  if (item.salaryMinCents === null && item.salaryMaxCents === null) return 'Valor a combinar';
  if (item.salaryMinCents !== null && item.salaryMaxCents !== null) return `${money.format(item.salaryMinCents / 100)} a ${money.format(item.salaryMaxCents / 100)}`;
  return money.format((item.salaryMinCents ?? item.salaryMaxCents ?? 0) / 100);
};

const CompanyOpportunitiesPage = () => {
  const { data, isLoading, isError, error, refetch } = useCompanyOpportunities();
  const { data: creditBalance } = useCompanyCreditBalance();
  const { data: creditPacks } = useCompanyCreditPacks();
  const { data: creditEvents } = useCompanyCreditEvents();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CompanyOpportunity | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');

  const opportunities = useMemo(() => {
    const items = data ?? [];
    return filter === 'all' ? items : items.filter((item) => item.status === filter);
  }, [data, filter]);

  const availableCredits = creditBalance?.availableCredits ?? 0;

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['company-opportunities'] }),
      queryClient.invalidateQueries({ queryKey: ['company-dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['company-credit-balance'] }),
      queryClient.invalidateQueries({ queryKey: ['company-credit-events'] }),
    ]);
  };

  const openNewOpportunity = () => {
    setForm({ ...EMPTY_FORM });
  };

  const save = async () => {
    if (!form) return;
    if (!form.id && creditBalance && availableCredits < 1) {
      toast({
        title: 'Sem créditos disponíveis',
        description: 'Adquira um pacote de publicações antes de publicar uma nova oportunidade.',
        variant: 'destructive',
      });
      return;
    }
    if (form.title.trim().length < 3 || form.description.trim().length < 20 || !form.location.trim() || !form.engagementType.trim()) {
      toast({ title: 'Preencha os campos obrigatórios', description: 'Informe título, localização, contratação e uma descrição completa.', variant: 'destructive' });
      return;
    }
    const salaryMinCents = form.salaryMin ? Math.round(Number(form.salaryMin.replace(',', '.')) * 100) : null;
    const salaryMaxCents = form.salaryMax ? Math.round(Number(form.salaryMax.replace(',', '.')) * 100) : null;
    if ((salaryMinCents !== null && !Number.isFinite(salaryMinCents)) || (salaryMaxCents !== null && !Number.isFinite(salaryMaxCents))) {
      toast({ title: 'Faixa salarial inválida', variant: 'destructive' });
      return;
    }

    setBusy(true);
    try {
      await companyService.saveOpportunity({
        id: form.id,
        title: form.title,
        kind: form.kind,
        location: form.location,
        engagementType: form.engagementType,
        workMode: form.workMode,
        description: form.description,
        requirements: form.requirements.split('\n'),
        benefits: form.benefits.split('\n'),
        salaryMinCents,
        salaryMaxCents,
        applicationDeadline: form.applicationDeadline || null,
      });
      await refresh();
      toast({
        title: form.id ? 'Oportunidade atualizada' : 'Oportunidade publicada',
        description: form.id ? 'A edição não consumiu crédito.' : 'Um crédito de publicação foi utilizado.',
      });
      setForm(null);
    } catch (saveError) {
      toast({ title: 'Não foi possível salvar', description: saveError instanceof Error ? saveError.message : 'Tente novamente.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (item: CompanyOpportunity) => {
    if (item.status === 'closed' && creditBalance && availableCredits < 1) {
      toast({
        title: 'Sem crédito para renovar',
        description: 'A renovação da oportunidade exige um novo crédito de publicação.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await companyService.setOpportunityStatus(item.id, item.status === 'open' ? 'closed' : 'open');
      await refresh();
      toast({
        title: item.status === 'open' ? 'Oportunidade encerrada' : 'Oportunidade renovada',
        description: item.status === 'closed' ? 'Um novo crédito de publicação foi utilizado.' : undefined,
      });
    } catch (statusError) {
      toast({ title: 'Situação não alterada', description: statusError instanceof Error ? statusError.message : 'Tente novamente.', variant: 'destructive' });
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      await companyService.deleteOpportunity(pendingDelete.id);
      await refresh();
      toast({ title: 'Oportunidade excluída', description: 'O crédito utilizado na publicação não foi restaurado.' });
      setPendingDelete(null);
    } catch (deleteError) {
      toast({ title: 'Não foi possível excluir', description: deleteError instanceof Error ? deleteError.message : 'Tente novamente.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <CompanyLayout>
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="vdm-eyebrow">Publicação e gestão</p>
          <h1 className="vdm-page-title mt-2">Oportunidades</h1>
          <p className="vdm-page-description">Cada publicação ou renovação utiliza um crédito da empresa.</p>
        </div>
        <Button onClick={openNewOpportunity}>
          <Plus className="size-4" />Nova oportunidade
        </Button>
      </header>

      <section className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Carteira de vagas</p>
                <p className="mt-3 font-display text-4xl font-bold text-white">{availableCredits}</p>
                <p className="mt-1 text-sm text-muted-foreground">créditos disponíveis</p>
              </div>
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Coins className="size-5" /></span>
            </div>
            <div className="mt-5 flex items-center gap-2 border-t border-white/8 pt-4 text-xs text-muted-foreground">
              <CalendarClock className="size-4 text-primary" />
              Próxima expiração: {formatDate(creditBalance?.nextExpirationAt ?? null)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Pacotes configurados</p>
              <p className="mt-1 text-sm text-muted-foreground">Valores, quantidades e validades são gerenciados pelo Portal do Administrador.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {(creditPacks ?? []).map((pack) => (
                <div key={pack.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <p className="font-semibold text-white">{pack.name}</p>
                  <p className="mt-2 text-xl font-bold text-primary">{money.format(pack.priceCents / 100)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{pack.creditQuantity} crédito(s) · validade de {pack.validityDays} dias</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {(creditEvents ?? []).length > 0 && (
        <div className="mb-6 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-xs text-muted-foreground">
          Última movimentação: {creditEvents?.[0]?.reference || creditEvents?.[0]?.type} · saldo após a operação: {creditEvents?.[0]?.balanceAfter}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {([['all', 'Todas'], ['open', 'Ativas'], ['closed', 'Encerradas']] as const).map(([value, label]) => (
          <Button key={value} variant={filter === value ? 'default' : 'outline'} size="sm" onClick={() => setFilter(value)}>{label}</Button>
        ))}
      </div>

      {isLoading ? <LoadingState rows={3} className="h-44 rounded-xl" /> : isError ? (
        <ErrorState description={error.message} onRetry={() => void refetch()} />
      ) : !opportunities.length ? (
        <EmptyState icon={BriefcaseBusiness} title="Nenhuma oportunidade nesta situação" description="Use um crédito para publicar a primeira oportunidade e começar a receber candidaturas." />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {opportunities.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <Badge variant={item.status === 'open' ? 'success' : 'secondary'}>{item.status === 'open' ? 'Ativa' : 'Encerrada'}</Badge>
                      <Badge variant="outline">{item.workMode === 'remote' ? 'Remoto' : item.workMode === 'hybrid' ? 'Híbrido' : 'Presencial'}</Badge>
                      {item.renewalCount > 0 && <Badge variant="outline">{item.renewalCount} renovação(ões)</Badge>}
                    </div>
                    <h2 className="font-display text-xl font-semibold text-white">{item.title}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">{item.location} · {item.engagementType}</p>
                  </div>
                  <div className="rounded-xl border border-primary/20 bg-primary/8 px-4 py-3 text-center">
                    <p className="font-display text-2xl font-bold text-white">{item.applicationCount}</p>
                    <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">candidatos</p>
                  </div>
                </div>
                <p className="mt-4 line-clamp-3 text-sm leading-6 text-[#d4d4d4]">{item.description}</p>
                <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                  <span>{salaryLabel(item)}</span>
                  <span>{item.applicationDeadline ? `Candidaturas até ${new Date(`${item.applicationDeadline}T12:00:00`).toLocaleDateString('pt-BR')}` : 'Sem prazo para candidatura'}</span>
                  <span>Publicação expira em {formatDate(item.postingExpiresAt)}</span>
                </div>
                <div className="mt-5 flex flex-wrap gap-2 border-t border-white/8 pt-4">
                  <Button variant="outline" size="sm" onClick={() => setForm(toForm(item))}><Pencil className="size-4" />Editar</Button>
                  <Button variant="outline" size="sm" onClick={() => void toggleStatus(item)}>
                    <Power className="size-4" />{item.status === 'open' ? 'Encerrar' : 'Renovar — 1 crédito'}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-300 hover:text-red-200" onClick={() => setPendingDelete(item)}><Trash2 className="size-4" />Excluir</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?.id ? 'Editar oportunidade' : 'Nova oportunidade'}</DialogTitle>
            <DialogDescription>
              {form?.id
                ? 'Editar os dados não consome um novo crédito.'
                : 'Ao publicar, um crédito será consumido de forma definitiva da carteira da empresa.'}
            </DialogDescription>
          </DialogHeader>
          {form && (
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="opportunity-title">Título</Label><Input id="opportunity-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="opportunity-kind">Categoria</Label><select id="opportunity-kind" className={selectClassName} value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as FormState['kind'] })}><option value="job">Vaga</option><option value="collab">Colaboração</option><option value="sync">Sync/licenciamento</option><option value="grant">Edital</option><option value="contest">Concurso</option></select></div>
              <div className="space-y-2"><Label htmlFor="opportunity-engagement">Tipo de contratação</Label><Input id="opportunity-engagement" value={form.engagementType} onChange={(event) => setForm({ ...form, engagementType: event.target.value })} placeholder="CLT, PJ, freelance, projeto..." /></div>
              <div className="space-y-2"><Label htmlFor="opportunity-location">Localização</Label><Input id="opportunity-location" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="opportunity-mode">Modelo de trabalho</Label><select id="opportunity-mode" className={selectClassName} value={form.workMode} onChange={(event) => setForm({ ...form, workMode: event.target.value as FormState['workMode'] })}><option value="onsite">Presencial</option><option value="hybrid">Híbrido</option><option value="remote">Remoto</option></select></div>
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="opportunity-description">Descrição</Label><Textarea id="opportunity-description" rows={6} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="opportunity-requirements">Requisitos — um por linha</Label><Textarea id="opportunity-requirements" rows={5} value={form.requirements} onChange={(event) => setForm({ ...form, requirements: event.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="opportunity-benefits">Benefícios — um por linha</Label><Textarea id="opportunity-benefits" rows={5} value={form.benefits} onChange={(event) => setForm({ ...form, benefits: event.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="opportunity-min">Valor mínimo (R$)</Label><Input id="opportunity-min" type="number" min="0" step="0.01" value={form.salaryMin} onChange={(event) => setForm({ ...form, salaryMin: event.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="opportunity-max">Valor máximo (R$)</Label><Input id="opportunity-max" type="number" min="0" step="0.01" value={form.salaryMax} onChange={(event) => setForm({ ...form, salaryMax: event.target.value })} /></div>
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="opportunity-deadline">Prazo para candidatura</Label><Input id="opportunity-deadline" type="date" value={form.applicationDeadline} onChange={(event) => setForm({ ...form, applicationDeadline: event.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
            <Button disabled={busy} onClick={() => void save()}>{busy ? 'Salvando...' : form?.id ? 'Salvar alterações' : 'Publicar — 1 crédito'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir oportunidade?</AlertDialogTitle>
            <AlertDialogDescription>
              A oportunidade “{pendingDelete?.title}” e seu histórico serão excluídos permanentemente. O crédito utilizado na publicação não será devolvido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={(event) => { event.preventDefault(); void confirmDelete(); }}>
              {busy ? 'Excluindo...' : 'Excluir definitivamente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CompanyLayout>
  );
};

export default CompanyOpportunitiesPage;
