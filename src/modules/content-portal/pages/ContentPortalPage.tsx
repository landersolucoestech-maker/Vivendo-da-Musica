import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';

import PublicLayout from '@/app/layouts/PublicLayout';
import { useArticleCategories, useArticles } from '@/modules/content-portal/hooks/useArticles';
import EmptyState from '@/shared/components/EmptyState';
import FilterBar from '@/shared/components/FilterBar';
import PaginationControls from '@/shared/components/PaginationControls';
import SearchInput from '@/shared/components/SearchInput';
import StatusBadge from '@/shared/components/StatusBadge';
import { usePagination } from '@/shared/hooks/usePagination';

const PAGE_SIZE = 9;

const ContentPortalPage = () => {
  const { data: articles } = useArticles();
  const { data: categories } = useArticleCategories();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('Todos');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (articles ?? []).filter((article) => {
      const matchesCategory = category === 'Todos' || article.category === category;
      const matchesQuery = !query || article.title.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [articles, search, category]);

  const {
    paginatedItems: visibleArticles,
    currentPage,
    totalPages,
    goToPage,
    setCurrentPage,
  } = usePagination({ items: filtered, pageSize: PAGE_SIZE });

  useEffect(() => {
    setCurrentPage(1);
  }, [search, category, setCurrentPage]);

  return (
    <PublicLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Conteúdos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Artigos e guias para acelerar sua carreira na música.</p>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar artigos..." className="flex-1" />
        <FilterBar options={[...(categories ?? [])]} value={category} onChange={setCategory} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nenhum artigo encontrado" description="Tente outra busca ou categoria." />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleArticles.map((article) => (
              <Link
                key={article.slug}
                to={`/conteudos/${article.slug}`}
                className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5 transition-colors hover:border-brand-medium/50"
              >
                <div className="flex items-center justify-between">
                  <StatusBadge status={article.level} label={article.level} />
                </div>
                <p className="font-semibold leading-snug">{article.title}</p>
                <p className="line-clamp-2 text-sm text-muted-foreground">{article.excerpt}</p>
                <div className="mt-auto flex items-center gap-3 pt-2 text-xs text-muted-foreground">
                  <span>#{article.tag}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5" />
                    {article.readMinutes} min
                  </span>
                </div>
              </Link>
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

export default ContentPortalPage;
