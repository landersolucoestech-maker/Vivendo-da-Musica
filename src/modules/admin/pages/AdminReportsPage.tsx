import { Download } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import AdminLayout from '@/app/layouts/AdminLayout';
import {
  useAdminCourseOverview,
  useAdminDashboardSummary,
  useAdminLearningSeries,
} from '@/modules/admin/hooks/useAdminDashboard';
import LoadingState from '@/shared/components/LoadingState';
import PageHeader from '@/shared/components/PageHeader';
import StatCard from '@/shared/components/StatCard';
import { Button } from '@/shared/components/ui/button';
import { useToast } from '@/shared/hooks/use-toast';

const courseStatusLabel = (status: string) => ({
  published: 'Publicado',
  draft: 'Rascunho',
  archived: 'Arquivado',
}[status] ?? status);

const AdminReportsPage = () => {
  const { toast } = useToast();
  const summaryQuery = useAdminDashboardSummary();
  const learningSeriesQuery = useAdminLearningSeries();
  const coursesQuery = useAdminCourseOverview();
  const isLoading = summaryQuery.isLoading || learningSeriesQuery.isLoading || coursesQuery.isLoading;
  const hasError = summaryQuery.isError || learningSeriesQuery.isError || coursesQuery.isError;

  return (
    <AdminLayout>
      <PageHeader
        title="Relatórios"
        subtitle="Indicadores acadêmicos e operacionais derivados do Supabase de desenvolvimento."
        actions={
          <Button
            variant="outline"
            onClick={() => toast({
              title: 'Exportação ainda não configurada',
              description: 'Os dados exibidos são reais; a geração de arquivo será habilitada após definição do formato oficial.',
            })}
          >
            <Download className="mr-2 size-4" />
            Exportar
          </Button>
        }
      />

      {isLoading && <LoadingState rows={8} />}
      {hasError && (
        <p className="mb-4 text-sm text-destructive">
          Não foi possível carregar todos os dados do relatório.
        </p>
      )}

      {summaryQuery.data && learningSeriesQuery.data && coursesQuery.data && !isLoading && !hasError && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Perfis cadastrados" value={summaryQuery.data.profiles.toLocaleString('pt-BR')} />
            <StatCard label="Cursos publicados" value={summaryQuery.data.publishedCourses.toLocaleString('pt-BR')} />
            <StatCard label="Matrículas ativas" value={summaryQuery.data.activeEnrollments.toLocaleString('pt-BR')} />
            <StatCard label="Aulas concluídas" value={summaryQuery.data.completedLessons.toLocaleString('pt-BR')} />
          </div>

          <div className="mb-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
            <section className="vdm-surface p-5">
              <h2 className="mb-4 text-sm font-semibold text-muted-foreground">Conclusões de aula — últimos 30 dias</h2>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={learningSeriesQuery.data}>
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12 }} />
                  <Line type="monotone" dataKey="value" stroke="#8A2BE2" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </section>

            <section className="vdm-surface p-5">
              <h2 className="mb-4 text-sm font-semibold text-muted-foreground">Interações</h2>
              <div className="space-y-4">
                <StatCard label="Comentários em aulas" value={summaryQuery.data.comments.toLocaleString('pt-BR')} />
                <StatCard label="Conversões de afiliados" value={summaryQuery.data.affiliateConversions.toLocaleString('pt-BR')} />
              </div>
            </section>
          </div>

          <section className="vdm-surface p-5">
            <h2 className="mb-4 text-sm font-semibold text-muted-foreground">Estrutura dos cursos</h2>
            <div className="space-y-3">
              {coursesQuery.data.map((course) => (
                <article key={course.id} className="flex flex-col gap-2 rounded-xl border border-white/8 bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-white">{course.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Status: {courseStatusLabel(course.status)}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{course.modules} módulos · {course.lessons} aulas</p>
                </article>
              ))}
              {coursesQuery.data.length === 0 && <p className="text-sm text-muted-foreground">Nenhum curso cadastrado.</p>}
            </div>
          </section>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminReportsPage;
