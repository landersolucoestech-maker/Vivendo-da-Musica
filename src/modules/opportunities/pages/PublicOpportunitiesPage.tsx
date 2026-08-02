import { useEffect, useMemo, useState } from 'react';
import { Building2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import PublicLayout from '@/app/layouts/PublicLayout';
import OpportunityCard from '@/modules/opportunities/components/OpportunityCard';
import { useOpenOpportunities } from '@/modules/opportunities/hooks/useOpportunities';
import EmptyState from '@/shared/components/EmptyState';
import ErrorState from '@/shared/components/ErrorState';
import FilterBar from '@/shared/components/FilterBar';
import LoadingState from '@/shared/components/LoadingState';
import PaginationControls from '@/shared/components/PaginationControls';
import SearchInput from '@/shared/components/SearchInput';
import { Button } from '@/shared/components/ui/button';
import { ROUTES } from '@/shared/constants/routes';
import { usePagination } from '@/shared/hooks/usePagination';

const PAGE_SIZE = 9;
const TYPE_FILTERS = ['Todos', 'CLT', 'PJ', 'Freelance', 'Projeto', 'Seleção contínua'];

const PublicOpportunitiesPage = () => {
  const navigate = useNavigate();
  const { data: open = [], error, isError, isLoading, refetch } = useOpenOpportunities();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('Todos');

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    return open.filter((opportunity) => {
      const matchesType = type === 'Todos' || opportunity.type === type;
      const matchesQuery = !query
        || opportunity.title.toLocaleLowerCase('pt-BR').includes(query)
        || opportunity.company.toLocaleLowerCase('pt-BR').includes(query)
        || opportunity.location.toLocaleLowerCase('pt-BR').includes(query);
      return matchesType && matchesQuery;
    });
  }, [open, search, type]);

  const {
    paginatedItems: visibleOpportunities, currentPage, totalPages, goToPage, setCurrentPage,
  } = usePagination({ items: filtered, pageSize: PAGE_SIZE });

  useEffect(() => {
    setCurrentPage(1);
  }, [search, type, setCurrentPage]);

  return (
    <PublicLayout>
      <header className="mb-8 flex flex-col gap-5 rounded-2xl border border-white/10 bg-card p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="vdm-eyebrow">Carreira e mercado</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-[-0.03em] text-white sm:text-4xl">Oportunidades</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">Vagas, projetos, seleções e parcerias para profissionais da comunidade musical.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="outline">
            <Link to={ROUTES.companyRegister}><Building2 className="size-4" />Cadastrar empresa</Link>
          </Button>
          <Button asChild>
            <Link to={ROUTES.company}>Publicar oportunidade</Link>
          </Button>
        </div>
      </header>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar oportunidades..." className="flex-1" />
        <div className="overflow-x-auto"><FilterBar options={TYPE_FILTERS} value={type} onChange={setType} /></div>
      </div>

      {isLoading ? (
        <LoadingState rows={3} className="h-40 rounded-xl" />
      ) : isError ? (
        <ErrorState description={error.message} onRetry={() => void refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState title="Nenhuma oportunidade encontrada" description="Tente outra busca ou tipo de oportunidade." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {visibleOpportunities.map((opportunity) => (
              <OpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
                actionLabel="Entrar para se candidatar"
                onAction={() => navigate(ROUTES.login)}
              />
            ))}
          </div>
          <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} className="mt-8" />
        </>
      )}
    </PublicLayout>
  );
};

export default PublicOpportunitiesPage;
