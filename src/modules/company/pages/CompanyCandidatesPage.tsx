import { useMemo, useState } from 'react';
import { ExternalLink, Search, UserRoundSearch } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import CompanyLayout from '@/app/layouts/CompanyLayout';
import { useCompanyCandidates } from '@/modules/company/hooks/useCompanyPortal';
import { companyService } from '@/modules/company/services/company.service';
import type { CompanyApplicationStatus, CompanyCandidate } from '@/modules/company/types/company.types';
import EmptyState from '@/shared/components/EmptyState';
import ErrorState from '@/shared/components/ErrorState';
import LoadingState from '@/shared/components/LoadingState';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { useToast } from '@/shared/hooks/use-toast';

const STATUS_LABELS: Record<CompanyApplicationStatus, string> = {
  submitted: 'Nova',
  reviewing: 'Em análise',
  shortlisted: 'Pré-selecionada',
  interview: 'Entrevista',
  approved: 'Aprovada',
  rejected: 'Recusada',
  withdrawn: 'Retirada',
};

const selectClassName = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const CompanyCandidatesPage = () => {
  const { data, isLoading, isError, error, refetch } = useCompanyCandidates();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | CompanyApplicationStatus>('all');
  const [opportunityId, setOpportunityId] = useState('all');
  const [selected, setSelected] = useState<CompanyCandidate | null>(null);
  const [draftStatus, setDraftStatus] = useState<CompanyApplicationStatus>('submitted');
  const [notes, setNotes] = useState('');
  const [response, setResponse] = useState('');
  const [busy, setBusy] = useState(false);

  const opportunities = useMemo(() => {
    const unique = new Map((data ?? []).map((candidate) => [candidate.opportunityId, candidate.opportunityTitle]));
    return [...unique.entries()];
  }, [data]);

  const candidates = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return (data ?? []).filter((candidate) => {
      if (status !== 'all' && candidate.status !== status) return false;
      if (opportunityId !== 'all' && candidate.opportunityId !== opportunityId) return false;
      if (!term) return true;
      return [candidate.name, candidate.headline, candidate.opportunityTitle, candidate.skills.join(' ')]
        .join(' ')
        .toLocaleLowerCase('pt-BR')
        .includes(term);
    });
  }, [data, opportunityId, search, status]);

  const openCandidate = (candidate: CompanyCandidate) => {
    setSelected(candidate);
    setDraftStatus(candidate.status);
    setNotes(candidate.recruiterNotes);
    setResponse('');
  };

  const save = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await companyService.updateApplication(selected.applicationId, draftStatus, notes, response);
      await queryClient.invalidateQueries({ queryKey: ['company-candidates'] });
      await queryClient.invalidateQueries({ queryKey: ['company-conversations'] });
      await queryClient.invalidateQueries({ queryKey: ['company-dashboard'] });
      toast({ title: 'Candidatura atualizada', description: response.trim() ? 'A resposta também foi enviada ao candidato.' : undefined });
      setSelected(null);
    } catch (saveError) {
      toast({ title: 'Não foi possível atualizar', description: saveError instanceof Error ? saveError.message : 'Tente novamente.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <CompanyLayout>
      <header className="mb-8">
        <p className="vdm-eyebrow">Recrutamento e seleção</p>
        <h1 className="vdm-page-title mt-2">Candidatos</h1>
        <p className="vdm-page-description">Analise perfis profissionais, portfólios, apresentações e etapas do processo.</p>
      </header>

      <div className="mb-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_260px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar candidato, habilidade ou oportunidade" />
        </div>
        <select className={selectClassName} value={status} onChange={(event) => setStatus(event.target.value as typeof status)} aria-label="Filtrar por etapa">
          <option value="all">Todas as etapas</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select className={selectClassName} value={opportunityId} onChange={(event) => setOpportunityId(event.target.value)} aria-label="Filtrar por oportunidade">
          <option value="all">Todas as oportunidades</option>
          {opportunities.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
        </select>
      </div>

      {isLoading ? <LoadingState rows={4} className="h-40 rounded-xl" /> : isError ? (
        <ErrorState description={error.message} onRetry={() => void refetch()} />
      ) : !candidates.length ? (
        <EmptyState icon={UserRoundSearch} title="Nenhum candidato encontrado" description="Ajuste os filtros ou aguarde novas candidaturas." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {candidates.map((candidate) => (
            <Card key={candidate.applicationId} className="transition hover:border-primary/30">
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-xl font-semibold text-white">{candidate.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{candidate.headline}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.1em] text-primary">{candidate.opportunityTitle}</p>
                  </div>
                  <Badge variant={candidate.status === 'approved' ? 'success' : candidate.status === 'rejected' ? 'secondary' : 'outline'}>{STATUS_LABELS[candidate.status]}</Badge>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {candidate.skills.slice(0, 5).map((skill) => <Badge key={skill} variant="secondary">{skill}</Badge>)}
                </div>

                <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                  <span>{candidate.city && candidate.state ? `${candidate.city}, ${candidate.state}` : 'Localização não informada'}</span>
                  <span>{candidate.experienceYears} {candidate.experienceYears === 1 ? 'ano' : 'anos'} de experiência</span>
                  <span>Candidatura em {new Date(candidate.appliedAt).toLocaleDateString('pt-BR')}</span>
                  <span>{candidate.portfolioUrl || candidate.applicationPortfolioUrl ? 'Portfólio disponível' : 'Sem portfólio informado'}</span>
                </div>

                <Button className="mt-5 w-full" variant="outline" onClick={() => openCandidate(candidate)}>Analisar candidatura</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
            <DialogDescription>{selected?.headline} · candidatura para {selected?.opportunityTitle}</DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
              <div className="space-y-5">
                <section className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
                  <h3 className="font-semibold text-white">Perfil profissional</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{selected.bio || 'O candidato ainda não adicionou uma apresentação profissional.'}</p>
                  <div className="mt-4 flex flex-wrap gap-2">{selected.skills.map((skill) => <Badge key={skill} variant="secondary">{skill}</Badge>)}</div>
                  <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    <span>{selected.city && selected.state ? `${selected.city}, ${selected.state}` : 'Localização não informada'}</span>
                    <span>{selected.experienceYears} anos de experiência</span>
                    <span>Disponibilidade: {selected.availability}</span>
                    <span>Interesses: {selected.preferredRoles.join(', ') || 'Não informados'}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {(selected.applicationPortfolioUrl || selected.portfolioUrl) && <Button asChild variant="outline" size="sm"><a href={selected.applicationPortfolioUrl || selected.portfolioUrl || '#'} target="_blank" rel="noreferrer">Abrir portfólio<ExternalLink className="size-4" /></a></Button>}
                    {selected.resumeUrl && <Button asChild variant="outline" size="sm"><a href={selected.resumeUrl} target="_blank" rel="noreferrer">Abrir currículo<ExternalLink className="size-4" /></a></Button>}
                  </div>
                </section>

                <section className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
                  <h3 className="font-semibold text-white">Apresentação da candidatura</h3>
                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#d4d4d4]">{selected.coverLetter}</p>
                </section>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="candidate-status">Etapa do processo</Label>
                  <select id="candidate-status" className={selectClassName} value={draftStatus} onChange={(event) => setDraftStatus(event.target.value as CompanyApplicationStatus)}>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="candidate-notes">Anotações internas</Label>
                  <Textarea id="candidate-notes" rows={7} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Registre percepções, próximos passos e observações da equipe." />
                  <p className="text-xs text-muted-foreground">Estas anotações não são exibidas ao candidato.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="candidate-response">Resposta ao candidato</Label>
                  <Textarea id="candidate-response" rows={7} value={response} onChange={(event) => setResponse(event.target.value)} placeholder="Envie uma atualização, convite para entrevista ou retorno sobre a seleção." />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancelar</Button>
            <Button disabled={busy} onClick={() => void save()}>{busy ? 'Salvando...' : 'Salvar e responder'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CompanyLayout>
  );
};

export default CompanyCandidatesPage;
