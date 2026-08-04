import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Pencil, Plus } from 'lucide-react';
import AdminLayout from '@/app/layouts/AdminLayout';
import PageHeader from '@/shared/components/PageHeader';
import StatCard from '@/shared/components/StatCard';
import DataTable from '@/shared/components/DataTable';
import SearchInput from '@/shared/components/SearchInput';
import FilterBar from '@/shared/components/FilterBar';
import StatusBadge from '@/shared/components/StatusBadge';
import { Button } from '@/shared/components/ui/button';
import CourseManagementDialog, { type CourseDialogMode } from '@/modules/courses/components/CourseManagementDialog';
import { courseManagementApi, type ManagedCourse } from '@/modules/courses/services/courseManagement.api';

const STATUS_FILTERS = ['Todos', 'published', 'draft', 'archived'];

const formatPrice = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

interface AdminCoursesPageProps {
  initialMode?: CourseDialogMode;
  initialCourseId?: string;
}

const AdminCoursesPage = ({ initialMode, initialCourseId }: AdminCoursesPageProps = {}) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('Todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<CourseDialogMode>('create');
  const [selectedCourse, setSelectedCourse] = useState<ManagedCourse | null>(null);
  const initialDialogHandled = useRef(false);

  const coursesQuery = useQuery({
    queryKey: ['managed-courses'],
    queryFn: courseManagementApi.listCourses,
  });

  const rows = useMemo(() => coursesQuery.data ?? [], [coursesQuery.data]);
  const filtered = useMemo(
    () => rows.filter((course) => {
      const matchesStatus = status === 'Todos' || course.status === status;
      const normalizedQuery = search.trim().toLowerCase();
      const matchesQuery = !normalizedQuery
        || course.title.toLowerCase().includes(normalizedQuery)
        || course.slug.toLowerCase().includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    }),
    [rows, search, status],
  );

  const openDialog = (mode: CourseDialogMode, course?: ManagedCourse) => {
    setDialogMode(mode);
    setSelectedCourse(course ?? null);
    setDialogOpen(true);
  };

  useEffect(() => {
    if (initialDialogHandled.current || !initialMode) return;
    if (initialMode !== 'create' && coursesQuery.isLoading) return;

    const course = initialCourseId ? rows.find((item) => item.id === initialCourseId) : undefined;
    openDialog(initialMode, course);
    initialDialogHandled.current = true;
  }, [coursesQuery.isLoading, initialCourseId, initialMode, rows]);

  return (
    <AdminLayout>
      <PageHeader
        title="Cursos"
        subtitle="Crie cursos e gerencie módulos, aulas e materiais somente em popups centralizados."
        actions={
          <Button onClick={() => openDialog('create')}>
            <Plus className="mr-2 h-4 w-4" />
            Novo curso
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total de cursos" value={String(rows.length)} />
        <StatCard label="Publicados" value={String(rows.filter((course) => course.status === 'published').length)} />
        <StatCard
          label="Aulas cadastradas"
          value={String(rows.reduce((total, course) => total + course.course_modules.reduce((moduleTotal, module) => moduleTotal + module.lessons.length, 0), 0))}
        />
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar cursos..." className="flex-1" />
        <FilterBar options={STATUS_FILTERS} value={status} onChange={setStatus} />
      </div>

      {coursesQuery.isError && (
        <p className="mb-4 text-sm text-destructive">
          Não foi possível carregar os cursos do Supabase DEV.
        </p>
      )}

      <DataTable
        rows={filtered}
        rowKey={(course) => course.id}
        emptyLabel={coursesQuery.isLoading ? 'Carregando cursos...' : 'Nenhum curso encontrado.'}
        columns={[
          { header: 'Título', cell: (course) => course.title },
          { header: 'Slug', cell: (course) => course.slug },
          { header: 'Valor original', cell: (course) => formatPrice(course.original_price_cents) },
          { header: 'Desconto', cell: (course) => formatPrice(course.discount_cents) },
          { header: 'Valor final', cell: (course) => formatPrice(course.price_cents) },
          { header: 'Módulos', cell: (course) => String(course.course_modules.length) },
          {
            header: 'Status',
            cell: (course) => (
              <StatusBadge
                status={course.status}
                label={course.status === 'published' ? 'Publicado' : course.status === 'draft' ? 'Rascunho' : 'Arquivado'}
              />
            ),
          },
          {
            header: 'Ações',
            cell: (course) => (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => openDialog('view', course)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Visualizar
                </Button>
                <Button size="sm" variant="outline" onClick={() => openDialog('edit', course)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              </div>
            ),
          },
        ]}
      />

      <CourseManagementDialog
        open={dialogOpen}
        mode={dialogMode}
        course={selectedCourse}
        onOpenChange={setDialogOpen}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['managed-courses'] })}
      />
    </AdminLayout>
  );
};

export default AdminCoursesPage;
