import { useEffect, useMemo, useState } from 'react';
import { Filter, Search, SlidersHorizontal } from 'lucide-react';

import PublicLayout from '@/app/layouts/PublicLayout';
import CourseCard from '@/modules/courses/components/CourseCard';
import { useCourseCards } from '@/modules/courses/hooks/useCourseCards';
import { useCourseCategories } from '@/modules/courses/hooks/useCourseCatalog';
import EmptyState from '@/shared/components/EmptyState';
import PaginationControls from '@/shared/components/PaginationControls';
import SearchInput from '@/shared/components/SearchInput';
import { Badge } from '@/shared/components/ui/badge';
import { usePagination } from '@/shared/hooks/usePagination';

const PAGE_SIZE = 9;

const CourseCatalogPage = () => {
  const { data: courseCards, isError } = useCourseCards();
  const { data: categories } = useCourseCategories();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('Todos');

  const categoryOptions = useMemo(
    () => Array.from(new Set(['Todos', ...(categories ?? []), ...(courseCards ?? []).map((course) => course.category)])),
    [categories, courseCards],
  );

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (courseCards ?? []).filter((course) => {
      const matchesCategory = category === 'Todos' || course.category === category;
      const matchesQuery = !query || course.title.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [courseCards, search, category]);

  const {
    paginatedItems: visibleCourses,
    currentPage,
    totalPages,
    goToPage,
    setCurrentPage,
  } = usePagination({ items: filteredCourses, pageSize: PAGE_SIZE });

  useEffect(() => {
    setCurrentPage(1);
  }, [search, category, setCurrentPage]);

  return (
    <PublicLayout>
      <section className="vdm-pattern-dots -mx-4 -mt-6 mb-8 border-b border-white/10 px-4 py-10 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="vdm-eyebrow">Academia Vivendo da Música</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.04em] text-white sm:text-5xl">
            Formação prática para quem vive de música.
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
            Cursos organizados por módulos e aulas, com materiais complementares e acompanhamento de progresso.
          </p>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[260px_1fr]">
        <aside className="vdm-surface h-fit p-4 xl:sticky xl:top-24">
          <div className="mb-4 flex items-center gap-2 border-b border-white/8 pb-4">
            <span className="vdm-icon-button size-9 border-primary/25 bg-primary/10 text-primary">
              <Filter className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Filtrar cursos</p>
              <p className="text-xs text-muted-foreground">Escolha uma categoria</p>
            </div>
          </div>

          <nav className="flex flex-wrap gap-2 xl:flex-col" aria-label="Categorias de cursos">
            {categoryOptions.map((item) => (
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
              <SearchInput value={search} onChange={setSearch} placeholder="Buscar cursos por título..." />
              <Search className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            </div>

            <div className="flex items-center gap-3">
              <Badge variant="outline" className="gap-2 px-3 py-1.5">
                <SlidersHorizontal className="size-3.5" />
                {filteredCourses.length} {filteredCourses.length === 1 ? 'curso' : 'cursos'}
              </Badge>
            </div>
          </div>

          {isError && (
            <div className="mb-5 rounded-lg border border-amber-500/25 bg-amber-500/8 px-4 py-3 text-sm text-amber-200">
              Não foi possível sincronizar todos os cursos neste momento. O catálogo disponível continua acessível.
            </div>
          )}

          {filteredCourses.length === 0 ? (
            <EmptyState
              title="Nenhum curso encontrado"
              description={category !== 'Todos' ? `Ainda não há cursos publicados em “${category}”.` : 'Tente outra busca.'}
            />
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
                {visibleCourses.map((course) => (
                  <CourseCard key={course.id} course={course} />
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

export default CourseCatalogPage;
