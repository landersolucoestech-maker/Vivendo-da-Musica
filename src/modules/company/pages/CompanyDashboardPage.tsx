import { BriefcaseBusiness, MessageSquareText, SearchCheck, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';

import CompanyLayout from '@/app/layouts/CompanyLayout';
import { useCompanyDashboard } from '@/modules/company/hooks/useCompanyPortal';
import ErrorState from '@/shared/components/ErrorState';
import LoadingState from '@/shared/components/LoadingState';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { ROUTES } from '@/shared/constants/routes';

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Nova',
  reviewing: 'Em análise',
  shortlisted: 'Pré-selecionada',
  interview: 'Entrevista',
  approved: 'Aprovada',
  rejected: 'Recusada',
  withdrawn: 'Retirada',
};

const CompanyDashboardPage = () => {
  const { data, isLoading, isError, error, refetch } = useCompanyDashboard();

  return (
    <CompanyLayout>
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="vdm-eyebrow">Gestão de oportunidades</p>
          <h1 className="vdm-page-title mt-2">Portal da Empresa</h1>
          <p className="vdm-page-description">Publique oportunidades, acompanhe candidaturas e converse com profissionais.</p>
        </div>
        <Button asChild>
          <Link to={ROUTES.companyOpportunities}>Gerenciar oportunidades</Link>
        </Button>
      </header>

      {isLoading ? (
        <LoadingState rows={4} className="h-32 rounded-xl" />
      ) : isError || !data ? (
        <ErrorState description={error?.message ?? 'Não foi possível carregar o portal empresarial.'} onRetry={() => void refetch()} />
      ) : (
        <>
          <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Oportunidades ativas', value: data.activeOpportunities, icon: BriefcaseBusiness },
              { label: 'Candidaturas', value: data.totalApplications, icon: UsersRound },
              { label: 'Em processo', value: data.applicationsInReview, icon: SearchCheck },
              { label: 'Mensagens não lidas', value: data.unreadMessages, icon: MessageSquareText },
            ].map((metric) => (
              <Card key={metric.label}>
                <CardContent className="flex items-center gap-4 p-5">
                  <span className="vdm-icon-button border-primary/25 bg-primary/10 text-primary">
                    <metric.icon className="size-5" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{metric.label}</p>
                    <p className="mt-1 font-display text-3xl font-bold text-white">{metric.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Oportunidades recentes</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">Desempenho das publicações da empresa.</p>
                </div>
                <Button asChild variant="outline" size="sm"><Link to={ROUTES.companyOpportunities}>Ver todas</Link></Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.recentOpportunities.length ? data.recentOpportunities.map((opportunity) => (
                  <div key={opportunity.id} className="flex flex-col gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-white">{opportunity.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{opportunity.location} · {opportunity.engagementType}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={opportunity.status === 'open' ? 'success' : 'secondary'}>{opportunity.status === 'open' ? 'Ativa' : 'Encerrada'}</Badge>
                      <span className="text-sm font-semibold text-white">{opportunity.applicationCount} candidatos</span>
                    </div>
                  </div>
                )) : <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma oportunidade publicada.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Candidaturas recentes</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">Perfis que exigem atenção da equipe.</p>
                </div>
                <Button asChild variant="outline" size="sm"><Link to={ROUTES.companyCandidates}>Analisar</Link></Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.recentCandidates.length ? data.recentCandidates.map((candidate) => (
                  <div key={candidate.applicationId} className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{candidate.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{candidate.headline}</p>
                      </div>
                      <Badge variant="outline">{STATUS_LABELS[candidate.status]}</Badge>
                    </div>
                    <p className="mt-3 text-xs uppercase tracking-[0.1em] text-primary">{candidate.opportunityTitle}</p>
                  </div>
                )) : <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma candidatura recebida.</p>}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </CompanyLayout>
  );
};

export default CompanyDashboardPage;
