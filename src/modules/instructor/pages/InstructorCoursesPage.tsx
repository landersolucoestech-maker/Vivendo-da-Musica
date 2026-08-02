import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Pencil, Plus } from 'lucide-react';

import InstructorLayout from '@/app/layouts/InstructorLayout';
import { supabase } from '@/integrations/supabase/client';
import CourseManagementDialog, { type CourseDialogMode } from '@/modules/courses/components/CourseManagementDialog';
import { courseManagementApi, type ManagedCourse } from '@/modules/courses/services/courseManagement.api';
import DataTable from '@/shared/components/DataTable';
import PageHeader from '@/shared/components/PageHeader';
import StatusBadge from '@/shared/components/StatusBadge';
import { Button } from '@/shared/components/ui/button';
import { getEffectiveUserId } from '@/shared/utils/devIdentity';

const formatPrice = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

const InstructorCoursesPage = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<CourseDialogMode>('create');
  const [selectedCourse, setSelectedCourse] = useState<ManagedCourse | null>(null);

  const coursesQuery = useQuery({
    queryKey: ['instructor-managed-courses'],
    queryFn: async () => {
      const [{ data: { user }, error }, courses] = await Promise.all([
        supabase.auth.getUser(),
        courseManagementApi.listCourses(),
      ]);
      if (error) throw new Error(error.message);
      const instructorId = await getEffectiveUserId(user?.id ?? null);
      return courses.filter((course) => course.instructor_id === instructorId);
    },
  });

  const courses = useMemo(() => coursesQuery.data ?? [], [coursesQuery.data]);

  const openDialog = (mode: CourseDialogMode, course?: ManagedCourse) => {
    setDialogMode(mode);
    setSelectedCourse(course ?? null);
    setDialogOpen(true);
  };

  return (
    <InstructorLayout>
      <PageHeader
        title="Meus cursos"
        subtitle="Crie cursos e gerencie módulos, aulas e materiais sem sair desta página."
        actions={
          <Button onClick={() => openDialog('create')}>
            <Plus className="mr-2 h-4 w-4" />
            Novo curso
          </Button>
        }
      />

      {coursesQuery.isError && (
        <p className="mb-4 text-sm text-destructive">
          Não foi possível carregar seus cursos do Supabase DEV.
        </p>
      )}

      <DataTable
        rows={courses}
        rowKey={(course) => course.id}
        emptyLabel={coursesQuery.isLoading ? 'Carregando cursos...' : 'Nenhum curso criado.'}
        columns={[
          { header: 'Título', cell: (course) => course.title },
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
        onSaved={() => {
          void queryClient.invalidateQueries({ queryKey: ['instructor-managed-courses'] });
          void queryClient.invalidateQueries({ queryKey: ['managed-courses'] });
        }}
      />
    </InstructorLayout>
  );
};

export default InstructorCoursesPage;
