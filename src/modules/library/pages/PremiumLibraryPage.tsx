import { useEffect, useMemo, useState } from "react";
import { Eye, Heart } from "lucide-react";
import StudentLayout from "@/app/layouts/StudentLayout";
import PageHeader from "@/shared/components/PageHeader";
import SearchInput from "@/shared/components/SearchInput";
import FilterBar from "@/shared/components/FilterBar";
import EmptyState from "@/shared/components/EmptyState";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/hooks/use-toast";
import { useLibraryItems, useLibraryTypes, useLibraryCategories } from "@/modules/library/hooks/useLibrary";
import type { PremiumLibraryItem } from "@/modules/library/types/library.types";

const PAGE_SIZE = 12;

const TAB_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'favoritos', label: 'Favoritos' },
  { value: 'recentes', label: 'Recentes' },
];

const PremiumLibraryPage = () => {
  const { toast } = useToast();
  const { data: libraryItems } = useLibraryItems();
  const { data: types } = useLibraryTypes();
  const { data: categories } = useLibraryCategories();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<string>('Todos');
  const [category, setCategory] = useState<string>('Todos');
  const [tab, setTab] = useState('todos');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    if (libraryItems) setFavorites(new Set(libraryItems.filter((i) => i.isFavorite).map((i) => i.id)));
  }, [libraryItems]);

  const toggleFavorite = (id: string) => {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    let items = libraryItems ?? [];
    if (tab === 'favoritos') items = items.filter((i) => favorites.has(i.id));
    if (tab === 'recentes') items = items.filter((i) => i.isNew);
    return items.filter((item: PremiumLibraryItem) => {
      const matchesType = type === 'Todos' || item.type === type;
      const matchesCategory = category === 'Todos' || item.category === category;
      const matchesQuery = !query || item.title.toLowerCase().includes(query);
      return matchesType && matchesCategory && matchesQuery;
    });
  }, [libraryItems, search, type, category, tab, favorites]);

  const visibleItems = filtered.slice(0, visibleCount);

  return (
    <StudentLayout>
      <PageHeader title="Biblioteca Premium" subtitle={`Conteúdo exclusivo para assinantes Premium — ${libraryItems?.length ?? 0} itens disponíveis.`} />

      <div className="flex flex-col gap-4 mb-6">
        <FilterBar options={TAB_OPTIONS} value={tab} onChange={(v) => { setTab(v); setVisibleCount(PAGE_SIZE); }} />
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar na biblioteca..." className="max-w-md" />
        <FilterBar options={[...(types ?? [])]} value={type} onChange={setType} />
        <FilterBar options={['Todos', ...(categories ?? [])]} value={category} onChange={setCategory} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nenhum item encontrado" description="Tente outra busca, tipo ou categoria." />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleItems.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-card p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-brand-medium font-medium">{item.type}</span>
                  <button
                    onClick={() => toggleFavorite(item.id)}
                    aria-label={favorites.has(item.id) ? `Remover ${item.title} dos favoritos` : `Adicionar ${item.title} aos favoritos`}
                    aria-pressed={favorites.has(item.id)}
                    className="text-muted-foreground hover:text-brand-medium"
                  >
                    <Heart className={`w-4 h-4 ${favorites.has(item.id) ? 'fill-brand-medium text-brand-medium' : ''}`} />
                  </button>
                </div>
                <div>
                  <p className="font-medium flex items-center gap-2">
                    {item.title}
                    {item.isNew && <span className="text-[10px] bg-brand-medium/10 text-brand-medium px-1.5 py-0.5 rounded-full">Novo</span>}
                  </p>
                  <p className="text-xs text-muted-foreground mb-1">{item.category}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-border mt-auto"
                  onClick={() => toast({ title: "Abrindo preview", description: item.title })}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Visualizar
                </Button>
              </div>
            ))}
          </div>

          {visibleCount < filtered.length && (
            <div className="flex justify-center mt-6">
              <Button variant="outline" className="border-border" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                Carregar mais ({filtered.length - visibleCount} restantes)
              </Button>
            </div>
          )}
        </>
      )}
    </StudentLayout>
  );
};

export default PremiumLibraryPage;
