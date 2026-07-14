import { useEffect, useMemo, useState } from "react";
import PublicLayout from "@/app/layouts/PublicLayout";
import SearchInput from "@/shared/components/SearchInput";
import EmptyState from "@/shared/components/EmptyState";
import PaginationControls from "@/shared/components/PaginationControls";
import { usePagination } from "@/shared/hooks/usePagination";
import { useCourseCards } from "@/modules/courses/hooks/useCourseCards";
import { useCourseCategories } from "@/modules/courses/hooks/useCourseCatalog";
import CourseCard from "@/modules/courses/components/CourseCard";

const PAGE_SIZE = 9;

const CourseCatalogPage = () => {
  const { data: courseCards, isError } = useCourseCards();
  const { data: categories } = useCourseCategories();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('Todos');
  const categoryOptions = useMemo(
    () => Array.from(new Set(['Todos', ...(categories ?? []), ...(courseCards ?? []).map((course) => course.category)])),
    [categories, courseCards]
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
    paginatedItems: visibleCourses, currentPage, totalPages, goToPage, setCurrentPage,
  } = usePagination({ items: filteredCourses, pageSize: PAGE_SIZE });

  useEffect(() => {
    setCurrentPage(1);
  }, [search, category, setCurrentPage]);

  return (
    <PublicLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Academia</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Aprenda com especialistas e leve sua música para o próximo nível.
        </p>
      </div>

      <div className="grid lg:grid-cols-[220px_1fr] gap-8">
        <aside>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Categorias</h2>
          <nav className="flex flex-col gap-1">
            {categoryOptions.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                  category === cat
                    ? 'bg-brand-medium/10 text-brand-medium font-medium'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                }`}
              >
                {cat}
              </button>
            ))}
          </nav>
        </aside>

        <div>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar cursos..." className="mb-6 max-w-md" />

          {isError && (
            <p className="text-xs text-muted-foreground mb-4">
              Não foi possível sincronizar cursos reais agora — mostrando o catálogo disponível.
            </p>
          )}

          {filteredCourses.length === 0 ? (
            <EmptyState
              title="Nenhum curso encontrado"
              description={category !== 'Todos' ? `Ainda não há cursos publicados em "${category}".` : 'Tente outra busca.'}
            />
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {visibleCourses.map((course) => (
                  <CourseCard key={course.id} course={course} />
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

export default CourseCatalogPage;
