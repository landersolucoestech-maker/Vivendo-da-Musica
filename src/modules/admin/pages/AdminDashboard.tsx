import { BookOpen, CheckCircle2, GraduationCap, MessageSquareText, Users, Waypoints } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import AdminLayout from '@/app/layouts/AdminLayout';
import {
  useAdminCourseOverview,
  useAdminDashboardSummary,
  useAdminLearningSeries,
  useAdminRecentActivity,
} from '@/modules/admin/hooks/useAdminDashboard';
import DataTable from '@/shared/components/DataTable';
import EmptyState from '@/shared/components/EmptyState';
import LoadingState from '@/shared/components/LoadingState';
import StatCard from '@/shared/components/StatCard';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

const formatDateTime = (value: string) => new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
}).format(new Date(value));

const AdminDashboard = () => {
  const summary = useAdminDashboardSummary();
  const series = useAdminLearningSeries();
  const courses = useAdminCourseOverview();
  const activity = useAdminRecentActivity();
  const isLoading = summary.isLoading || series.isLoading || courses.isLoading || activity.isLoading;
  const hasError = summary.isError || series.isError || courses.isError || activity.isError;

  return (
    <AdminLayout>
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="vdm-eyebrow">Administração</p>
          <h1 className="vdm-page-title mt-2">Operação real do ambiente de desenvolvimento</h1>
          <p className="vdm-page-description">Indicadores derivados exclusivamente das tabelas existentes no Supabase `dev`.</p>
        </div>
        <Badge variant="outline" className="w-fit px-3 py-1">Dados do branch dev</Badge>
      </header>

      {isLoading && <LoadingState rows={6} />}
      {hasError && <EmptyState title="Não foi possível carregar o painel administrativo" description="Revise as permissões e a conectividade com o Supabase dev." />}

      {summary.data && !isLoading && !hasError && (
        <>
          <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard label="Perfis cadastrados" value={String(summary.data.profiles)} icon={Users} />
            <StatCard label="Cursos publicados" value={String(summary.data.publishedCourses)} icon={BookOpen} />
            <StatCard label="Matrículas ativas" value={String(summary.data.activeEnrollments)} icon={GraduationCap} />
            <StatCard label="Aulas concluídas" value={String(summary.data.completedLessons)} icon={CheckCircle2} />
            <StatCard label="Comentários em aulas" value={String(summary.data.comments)} icon={MessageSquareText} />
            <StatCard label="Conversões de afiliados" value={String(summary.data.affiliateConversions)} icon={Waypoints} />
          </section>

          <section className="mb-8 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <Card>
              <CardHeader>
                <p className="vdm-eyebrow">Aprendizado</p>
                <CardTitle className="mt-1 text-xl">Conclusões de aulas nos últimos 30 dias</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={series.data ?? []}>
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: '#151515', border: '1px solid #333', borderRadius: 12 }} />
                    <Line type="monotone" dataKey="value" stroke="#8A2BE2" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: '#6C3AED' }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <p className="vdm-eyebrow">Atividade</p>
                <CardTitle className="mt-1 text-xl">Atualizações recentes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(activity.data ?? []).length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma atividade registrada.</p>}
                {(activity.data ?? []).map((item) => (
                  <article key={item.id} className="border-b border-white/8 pb-4 last:border-0 last:pb-0">
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(item.occurredAt)}</p>
                  </article>
                ))}
              </CardContent>
            </Card>
          </section>

          <section>
            <div className="mb-3">
              <p className="vdm-eyebrow">Conteúdo</p>
              <h2 className="mt-1 text-xl font-semibold">Estrutura dos cursos</h2>
            </div>
            <DataTable
              rows={courses.data ?? []}
              rowKey={(course) => course.id}
              emptyLabel="Nenhum curso cadastrado."
              columns={[
                { header: 'Curso', cell: (course) => course.title },
                { header: 'Módulos', cell: (course) => String(course.modules) },
                { header: 'Aulas', cell: (course) => String(course.lessons) },
                { header: 'Status', cell: (course) => <Badge variant={course.status === 'published' ? 'success' : 'secondary'}>{course.status === 'published' ? 'Publicado' : 'Rascunho'}</Badge> },
              ]}
            />
          </section>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
