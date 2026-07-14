import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Lock } from "lucide-react";
import PublicLayout from "@/app/layouts/PublicLayout";
import SearchInput from "@/shared/components/SearchInput";
import FilterBar from "@/shared/components/FilterBar";
import EmptyState from "@/shared/components/EmptyState";
import StatusBadge from "@/shared/components/StatusBadge";
import PaginationControls from "@/shared/components/PaginationControls";
import { usePagination } from "@/shared/hooks/usePagination";
import { useArticles, useArticleCategories } from "@/modules/content-portal/hooks/useArticles";

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
    paginatedItems: visibleArticles, currentPage, totalPages, goToPage, setCurrentPage,
  } = usePagination({ items: filtered, pageSize: PAGE_SIZE });

  useEffect(() => {
    setCurrentPage(1);
  }, [search, category, setCurrentPage]);

  return (
    <PublicLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Conteúdos</h1>
        <p className="text-muted-foreground text-sm mt-1">Artigos e guias para acelerar sua carreira na música.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar artigos..." className="flex-1" />
        <FilterBar options={[...(categories ?? [])]} value={category} onChange={setCategory} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nenhum artigo encontrado" description="Tente outra busca ou categoria." />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleArticles.map((article) => (
              <Link
                key={article.slug}
                to={`/conteudos/${article.slug}`}
                className="rounded-lg border border-border bg-card p-5 flex flex-col gap-3 hover:border-brand-medium/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <StatusBadge status={article.level} label={article.level} />
                  {article.isPremium && <Lock className="w-4 h-4 text-amber-400" />}
                </div>
                <p className="font-semibold leading-snug">{article.title}</p>
                <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto pt-2">
                  <span>#{article.tag}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{article.readMinutes} min</span>
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
