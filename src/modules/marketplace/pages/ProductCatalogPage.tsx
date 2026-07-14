import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import PublicLayout from "@/app/layouts/PublicLayout";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import PaginationControls from "@/shared/components/PaginationControls";
import { usePagination } from "@/shared/hooks/usePagination";
import { useProducts, useProductCategories } from "@/modules/marketplace/hooks/useProducts";
import ProductCard from "@/modules/marketplace/components/ProductCard";
import { ROUTES } from "@/shared/constants/routes";

const PAGE_SIZE = 9;

const ProductCatalogPage = () => {
  const { data: products, isLoading, isError } = useProducts();
  const { data: categories } = useProductCategories();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const productCategories = categories ?? [];

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = category === "Todos" || product.category === category;
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Marketplace</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Packs, templates e ferramentas para elevar sua producao musical.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Categorias</h2>
          <nav className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setCategory("Todos")}
              className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                category === "Todos"
                  ? "bg-brand-medium/10 font-medium text-brand-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Todos
            </button>
            <Link
              to={ROUTES.marketplaceBeats}
              className="rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Beats
            </Link>
            {productCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  category === cat
                    ? "bg-brand-medium/10 font-medium text-brand-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </nav>
        </aside>

        <div>
          <div className="mb-6 flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar produtos..."
                className="pl-9"
              />
            </div>
            <Button variant="outline">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filtros
            </Button>
          </div>

          {isLoading && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          )}

          {isError && (
            <div className="rounded-lg border border-border bg-card p-10 text-center text-muted-foreground">
              Nao foi possivel carregar os produtos agora. Tente novamente em alguns instantes.
            </div>
          )}

          {!isLoading && !isError && filteredProducts.length === 0 && (
            <div className="rounded-lg border border-border bg-card p-10 text-center text-muted-foreground">
              Nenhum produto encontrado para essa busca.
            </div>
          )}

          {!isLoading && !isError && filteredProducts.length > 0 && (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {visibleProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
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
        </div>
      </div>
    </PublicLayout>
  );
};

export default ProductCatalogPage;
