import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import PublicLayout from "@/app/layouts/PublicLayout";
import BeatCard from "@/modules/marketplace/components/BeatCard";
import LoadingState from "@/shared/components/LoadingState";
import EmptyState from "@/shared/components/EmptyState";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useBeats } from "@/modules/marketplace/hooks/useBeats";
import { useProductCategories } from "@/modules/marketplace/hooks/useProducts";
import { ROUTES } from "@/shared/constants/routes";

const BeatMarketplacePage = () => {
  const { data: beats, isLoading, isError } = useBeats();
  const { data: categories } = useProductCategories();
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("Todos");

  const genres = useMemo(
    () => ["Todos", ...Array.from(new Set((beats ?? []).map((beat) => beat.genre)))],
    [beats]
  );

  const filteredBeats = useMemo(() => {
    const query = search.trim().toLowerCase();

    return (beats ?? []).filter((beat) => {
      const matchesGenre = genre === "Todos" || beat.genre === genre;
      const matchesQuery = !query || [beat.title, beat.producerName, beat.genre, beat.mood]
        .some((value) => value.toLowerCase().includes(query));

      return matchesGenre && matchesQuery;
    });
  }, [beats, genre, search]);

  return (
    <PublicLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Marketplace</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Beats, packs, templates e ferramentas para producao musical.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Categorias</h2>
          <nav className="flex flex-col gap-1">
            <Link
              to={ROUTES.marketplace}
              className="rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Todos
            </Link>
            <Link
              to={ROUTES.marketplaceBeats}
              aria-current="page"
              className="rounded-lg bg-brand-medium/10 px-3 py-2 text-left text-sm font-medium text-brand-medium"
            >
              Beats
            </Link>
            {(categories ?? []).map((category) => (
              <Link
                key={category}
                to={ROUTES.marketplace}
                className="rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {category}
              </Link>
            ))}
          </nav>

          <div className="mt-6">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Generos</h2>
            <nav className="flex flex-col gap-1">
              {genres.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setGenre(item)}
                  className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    genre === item
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {item}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <main>
          <div className="mb-6 flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar beats..."
                className="pl-9"
              />
            </div>
            <Button variant="outline">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filtros
            </Button>
          </div>

          {isLoading && <LoadingState rows={6} className="h-36 rounded-lg" />}
          {isError && <EmptyState title="Nao foi possivel carregar os beats" />}
          {!isLoading && !isError && filteredBeats.length === 0 && (
            <EmptyState title="Nenhum beat encontrado" description="Ajuste os filtros ou busque outro termo." />
          )}
          {!isLoading && !isError && filteredBeats.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {filteredBeats.map((beat) => (
                <BeatCard key={beat.id} beat={beat} />
              ))}
            </div>
          )}
        </main>
      </div>
    </PublicLayout>
  );
};

export default BeatMarketplacePage;
