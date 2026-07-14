import { BookOpen, CircleDollarSign, GraduationCap, ShoppingBag } from "lucide-react";
import InstructorLayout from "@/app/layouts/InstructorLayout";
import { useInstructorDashboard } from "@/modules/instructor/hooks/useInstructorDashboard";
import PageHeader from "@/shared/components/PageHeader";
import StatCard from "@/shared/components/StatCard";
import StatusBadge from "@/shared/components/StatusBadge";
import { formatPrice } from "@/shared/utils/formatters";

const InstructorDashboard = () => {
  const { data, isLoading, isError } = useInstructorDashboard();
  return (
    <InstructorLayout>
      <PageHeader title="Dashboard do instrutor" subtitle="Desempenho dos seus cursos, alunos e vendas confirmadas." />
      {isLoading && <p className="text-sm text-muted-foreground">Carregando dados do instrutor...</p>}
      {isError && <p className="text-sm text-destructive">Não foi possível carregar o dashboard.</p>}
      {data && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Cursos" value={String(data.courses)} delta={`${data.publishedCourses} publicados`} icon={BookOpen} />
            <StatCard label="Alunos ativos" value={data.activeStudents.toLocaleString('pt-BR')} icon={GraduationCap} />
            <StatCard label="Vendas pagas" value={data.paidSales.toLocaleString('pt-BR')} icon={ShoppingBag} />
            <StatCard label="Receita confirmada" value={formatPrice(data.revenueCents, data.currency)} icon={CircleDollarSign} />
          </div>
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-semibold mb-4">Cursos recentes</h2>
            {!data.recentCourses.length ? <p className="text-sm text-muted-foreground">Nenhum curso atribuído a este instrutor.</p> : (
              <div className="space-y-3">
                {data.recentCourses.map((course) => (
                  <div key={course.id} className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
                    <div><p className="font-medium">{course.title}</p><p className="text-xs text-muted-foreground">Criado em {new Intl.DateTimeFormat('pt-BR').format(new Date(course.createdAt))}</p></div>
                    <StatusBadge status={course.status} label={course.status === 'published' ? 'Publicado' : course.status === 'draft' ? 'Rascunho' : 'Arquivado'} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </InstructorLayout>
  );
};

export default InstructorDashboard;
