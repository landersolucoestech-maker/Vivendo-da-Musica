import { useEffect, useMemo, useState } from "react";
import PublicLayout from "@/app/layouts/PublicLayout";
import EventCard from "@/shared/components/EventCard";
import EmptyState from "@/shared/components/EmptyState";
import FilterBar from "@/shared/components/FilterBar";
import PaginationControls from "@/shared/components/PaginationControls";
import { usePagination } from "@/shared/hooks/usePagination";
import { useEvents, useEventCategories } from "@/modules/events/hooks/useEvents";

const STATUS_TABS = [
  { value: 'todos', label: 'Todos' },
  { value: 'upcoming', label: 'Próximos' },
  { value: 'live', label: 'Ao vivo' },
  { value: 'replay', label: 'Gravados' },
];

const PAGE_SIZE = 9;

const EventsListingPage = () => {
  const { data: events } = useEvents();
  const { data: categories } = useEventCategories();
  const [statusFilter, setStatusFilter] = useState('todos');
  const [category, setCategory] = useState('Todos');

  const filteredEvents = useMemo(() => {
    return (events ?? []).filter((event) => {
      const matchesStatus = statusFilter === 'todos' || event.status === statusFilter;
      const matchesCategory = category === 'Todos' || event.category === category;
      return matchesStatus && matchesCategory;
    });
  }, [events, statusFilter, category]);

  const {
    paginatedItems: visibleEvents, currentPage, totalPages, goToPage, setCurrentPage,
  } = usePagination({ items: filteredEvents, pageSize: PAGE_SIZE });

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, category, setCurrentPage]);

  return (
    <PublicLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Eventos</h1>
        <p className="text-muted-foreground text-sm mt-1">Participe de eventos exclusivos e transforme sua carreira.</p>
      </div>

      <div className="mb-6">
        <FilterBar options={STATUS_TABS} value={statusFilter} onChange={setStatusFilter} />
      </div>

      <div className="mb-6">
        <FilterBar options={['Todos', ...(categories ?? [])]} value={category} onChange={setCategory} />
      </div>

      {filteredEvents.length === 0 ? (
        <EmptyState title="Nenhum evento encontrado" description="Tente outro filtro ou volte mais tarde." />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {visibleEvents.map((event) => (
              <EventCard key={event.slug} event={event} />
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

export default EventsListingPage;
