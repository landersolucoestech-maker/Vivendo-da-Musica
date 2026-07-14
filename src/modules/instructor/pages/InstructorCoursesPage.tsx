import { useState } from "react";
import { Link } from "react-router-dom";
import { Archive, Pencil, Plus, Send } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import InstructorLayout from "@/app/layouts/InstructorLayout";
import { useInstructorCourses } from "@/modules/instructor/hooks/useInstructorCourses";
import { instructorService } from "@/modules/instructor/services/instructor.service";
import DataTable from "@/shared/components/DataTable";
import PageHeader from "@/shared/components/PageHeader";
import StatusBadge from "@/shared/components/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import { ROUTES } from "@/shared/constants/routes";
import { useToast } from "@/shared/hooks/use-toast";
import { formatPrice } from "@/shared/utils/formatters";

const InstructorCoursesPage = () => {
  const { data, isError } = useInstructorCourses();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [changing, setChanging] = useState<string | null>(null);

  const changeStatus = async (courseId: string, status: 'published' | 'archived') => {
    setChanging(courseId);
    try {
      await instructorService.setCourseStatus(courseId, status);
      await queryClient.invalidateQueries({ queryKey: ['instructor-courses'] });
      await queryClient.invalidateQueries({ queryKey: ['instructor-dashboard'] });
      toast({ title: status === 'published' ? 'Curso publicado' : 'Curso arquivado' });
    } catch (error) {
      toast({ title: 'Não foi possível alterar a publicação', description: error instanceof Error ? error.message : 'Revise o conteúdo e tente novamente.', variant: 'destructive' });
    } finally { setChanging(null); }
  };

  return (
    <InstructorLayout>
      <PageHeader title="Meus cursos" subtitle="Crie, publique e gerencie somente os cursos atribuídos a você." actions={<Link to={ROUTES.instructorCourseNew}><Button><Plus className="mr-2 h-4 w-4" />Novo curso</Button></Link>} />
      {isError && <p className="mb-4 text-sm text-destructive">Não foi possível carregar seus cursos.</p>}
      <DataTable rows={data ?? []} rowKey={(course) => course.id} emptyLabel="Nenhum curso criado." columns={[
        { header: 'Título', cell: (course) => course.title },
        { header: 'Preço', cell: (course) => formatPrice(course.priceCents, course.currency) },
        { header: 'Status', cell: (course) => <StatusBadge status={course.status} label={course.status === 'published' ? 'Publicado' : course.status === 'draft' ? 'Rascunho' : 'Arquivado'} /> },
        { header: '', cell: (course) => <div className="flex flex-wrap gap-2"><Link to={ROUTES.instructorCourseEdit(course.id)}><Button size="sm" variant="outline"><Pencil className="mr-2 h-4 w-4" />Editar</Button></Link>{course.status !== 'published' ? <Button size="sm" disabled={changing === course.id} onClick={() => changeStatus(course.id, 'published')}><Send className="mr-2 h-4 w-4" />Publicar</Button> : <Button size="sm" variant="outline" disabled={changing === course.id} onClick={() => changeStatus(course.id, 'archived')}><Archive className="mr-2 h-4 w-4" />Arquivar</Button>}</div> },
      ]} />
    </InstructorLayout>
  );
};

export default InstructorCoursesPage;
