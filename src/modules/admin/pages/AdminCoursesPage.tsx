import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil } from "lucide-react";
import AdminLayout from "@/app/layouts/AdminLayout";
import PageHeader from "@/shared/components/PageHeader";
import StatCard from "@/shared/components/StatCard";
import DataTable from "@/shared/components/DataTable";
import SearchInput from "@/shared/components/SearchInput";
import FilterBar from "@/shared/components/FilterBar";
import StatusBadge from "@/shared/components/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import { useCourseCards } from "@/modules/courses/hooks/useCourseCards";
import { ROUTES } from "@/shared/constants/routes";
import { formatPriceOrFree as formatPrice } from "@/shared/utils/formatters";

const STATUS_FILTERS = ['Todos', 'published', 'draft'];

const AdminCoursesPage = () => {
  const { data: courseCards, isError } = useCourseCards();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('Todos');

  const rows = (courseCards ?? []).map((c) => ({ ...c, status: 'published' as const }));

  const filtered = rows.filter((row) => {
    const matchesStatus = status === 'Todos' || row.status === status;
    const matchesQuery = !search.trim() || row.title.toLowerCase().includes(search.trim().toLowerCase());
    return matchesStatus && matchesQuery;
  });

  return (
    <AdminLayout>
      <PageHeader
        title="Cursos"
        subtitle="Cursos publicados, em rascunho ou arquivados."
        actions={
          <Link to={ROUTES.adminCourseNew}>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo curso
            </Button>
          </Link>
        }
      />

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total de cursos" value={String(rows.length)} />
        <StatCard label="Publicados" value={String(rows.filter((r) => r.status === 'published').length)} />
        <StatCard label="Alunos matriculados" value={rows.reduce((sum, r) => sum + r.studentsCount, 0).toLocaleString('pt-BR')} />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar cursos..." className="flex-1" />
        <FilterBar options={STATUS_FILTERS} value={status} onChange={setStatus} />
      </div>

      {isError && (
        <p className="text-xs text-muted-foreground mb-4">
          Não foi possível sincronizar cursos reais agora — mostrando o catálogo de demonstração.
        </p>
      )}

      <DataTable
        rows={filtered}
        rowKey={(course) => course.id}
        emptyLabel="Nenhum curso encontrado."
        columns={[
          { header: 'Título', cell: (course) => course.title },
          { header: 'Slug', cell: (course) => course.slug },
          { header: 'Preço', cell: (course) => formatPrice(course.priceCents, course.currency) },
          { header: 'Alunos', cell: (course) => course.studentsCount.toLocaleString('pt-BR') },
          { header: 'Status', cell: (course) => <StatusBadge status={course.status} label={course.status === 'published' ? 'Publicado' : 'Rascunho'} /> },
          {
            header: '',
            cell: (course) => (
              <Link to={ROUTES.adminCourseEdit(course.id)}>
                <Button size="sm" variant="outline" className="border-border">
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              </Link>
            ),
          },
        ]}
      />
    </AdminLayout>
  );
};

export default AdminCoursesPage;
