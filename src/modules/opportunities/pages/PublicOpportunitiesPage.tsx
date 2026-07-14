import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PublicLayout from "@/app/layouts/PublicLayout";
import EmptyState from "@/shared/components/EmptyState";
import ErrorState from "@/shared/components/ErrorState";
import LoadingState from "@/shared/components/LoadingState";
import FilterBar from "@/shared/components/FilterBar";
import PaginationControls from "@/shared/components/PaginationControls";
import SearchInput from "@/shared/components/SearchInput";
import { usePagination } from "@/shared/hooks/usePagination";
import OpportunityCard from "@/modules/opportunities/components/OpportunityCard";
import { useOpenOpportunities } from "@/modules/opportunities/hooks/useOpportunities";
import { ROUTES } from "@/shared/constants/routes";

const PAGE_SIZE = 9;
const TYPE_FILTERS = ['Todos', 'Freelance', 'Meio perÃ­odo', 'Pontual', 'Projeto'];

const PublicOpportunitiesPage = () => {
  const navigate = useNavigate();
  const { data: open = [], error, isError, isLoading, refetch } = useOpenOpportunities();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('Todos');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return open.filter((opportunity) => {
      const matchesType = type === 'Todos' || opportunity.type === type;
      const matchesQuery = !query
        || opportunity.title.toLowerCase().includes(query)
        || opportunity.company.toLowerCase().includes(query)
        || opportunity.location.toLowerCase().includes(query);
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Oportunidades</h1>
        <p className="text-muted-foreground text-sm mt-1">Vagas, projetos e parcerias para produtores e artistas da comunidade.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar oportunidades..." className="flex-1" />
        <FilterBar options={TYPE_FILTERS} value={type} onChange={setType} />
      </div>

      {isLoading ? (
        <LoadingState rows={3} className="h-40 rounded-xl" />
      ) : isError ? (
        <ErrorState description={error.message} onRetry={() => void refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState title="Nenhuma oportunidade encontrada" description="Tente outra busca ou tipo de oportunidade." />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 gap-4">
            {visibleOpportunities.map((opp) => (
              <OpportunityCard
                key={opp.id}
                opportunity={opp}
                actionLabel="Entrar para se candidatar"
                onAction={() => navigate(ROUTES.login)}
              />
            ))}
          </div>
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            className="mt-8"
          />
        </>
      )}
    </PublicLayout>
  );
};

export default PublicOpportunitiesPage;
