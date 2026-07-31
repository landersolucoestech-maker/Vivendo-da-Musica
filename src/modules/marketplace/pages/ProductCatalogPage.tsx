import { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, Store } from 'lucide-react';
import { Link } from 'react-router-dom';

import PublicLayout from '@/app/layouts/PublicLayout';
import ProductCard from '@/modules/marketplace/components/ProductCard';
import { useProductCategories, useProducts } from '@/modules/marketplace/hooks/useProducts';
import PaginationControls from '@/shared/components/PaginationControls';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { ROUTES } from '@/shared/constants/routes';
import { usePagination } from '@/shared/hooks/usePagination';

const PAGE_SIZE = 9;

const ProductCatalogPage = () => {
  const { data: products, isLoading, isError } = useProducts();
  const { data: categories } = useProductCategories();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const productCategories = categories ?? [];

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = category === 'Todos' || product.category === category;
      const matchesQuery = !query || product.title.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [products, search, category]);

  const {
    paginatedItems: visibleProducts,
    currentPage,
    totalPages,
    goToPage,
    setCurrentPage,
  } = usePagination({ items: filteredProducts, pageSize: PAGE_SIZE });

  useEffect(() => {
    setCurrentPage(1);
  }, [search, category, setCurrentPage]);

  return (
    <PublicLayout>
      <section className="vdm-pattern-dots -mx-4 -mt-6 mb-8 border-b border-white/10 px-4 py-10 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="vdm-eyebrow">Marketplace musical</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.04em] text-white sm:text-5xl">
            Recursos profissionais para sua produção.
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
            Packs, templates, presets, beats e ferramentas digitais reunidos em um único catálogo.
          </p>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[260px_1fr]">
        <aside className="vdm-surface h-fit p-4 xl:sticky xl:top-24">
          <div className="mb-4 flex items-center gap-3 border-b border-white/8 pb-4">
            <span className="vdm-icon-button size-9 border-primary/25 bg-primary/10 text-primary">
              <Store className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Categorias</p>
              <p className="text-xs text-muted-foreground">Explore por tipo de produto</p>
            </div>
          </div>

          <nav className="flex flex-wrap gap-2 xl:flex-col" aria-label="Categorias do marketplace">
            <button
              type="button"
              onClick={() => setCategory('Todos')}
              className={`rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                category === 'Todos'
                  ? 'bg-primary text-white shadow-[0_8px_24px_rgba(138,43,226,0.28)]'
                  : 'border border-white/8 bg-white/[0.02] text-muted-foreground hover:border-primary/30 hover:bg-primary/10 hover:text-white'
              }`}
            >
              Todos
            </button>

            <Link
              to={ROUTES.marketplaceBeats}
              className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-left text-sm font-medium text-muted-foreground transition hover:border-primary/30 hover:bg-primary/10 hover:text-white"
            >
              Beats e licenças
            </Link>

            {productCategories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                  category === item
                    ? 'bg-primary text-white shadow-[0_8px_24px_rgba(138,43,226,0.28)]'
                    : 'border border-white/8 bg-white/[0.02] text-muted-foreground hover:border-primary/30 hover:bg-primary/10 hover:text-white'
                }`}
              >
                {item}
              </button>
            ))}
          </nav>
        </aside>

        <section>
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-xl">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar produtos..."
                className="pl-9"
              />
            </div>

            <Badge variant="outline" className="w-fit gap-2 px-3 py-1.5">
              <SlidersHorizontal className="size-3.5" />
              {filteredProducts.length} {filteredProducts.length === 1 ? 'produto' : 'produtos'}
            </Badge>
          </div>

          {isLoading && (
            <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="aspect-[4/5] rounded-xl bg-white/5" />
              ))}
            </div>
          )}

          {isError && (
            <div className="vdm-surface p-10 text-center">
              <p className="text-sm text-muted-foreground">
                Não foi possível carregar os produtos agora. Tente novamente em alguns instantes.
              </p>
            </div>
          )}

          {!isLoading && !isError && filteredProducts.length === 0 && (
            <div className="vdm-surface p-10 text-center">
              <p className="text-sm text-muted-foreground">Nenhum produto encontrado para essa busca.</p>
            </div>
          )}

          {!isLoading && !isError && filteredProducts.length > 0 && (
            <>
              <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
                {visibleProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={goToPage}
                className="mt-10"
              />
            </>
          )}
        </section>
      </div>
    </PublicLayout>
  );
};

export default ProductCatalogPage;
