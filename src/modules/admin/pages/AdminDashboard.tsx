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
          <section className="mb-8">
            <Card>
              <CardHeader className="pb-4">
                <p className="vdm-eyebrow">Visão geral</p>
                <CardTitle className="mt-1 text-xl">Operação da plataforma</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 border-b border-border pb-6 md:grid-cols-3 md:gap-0">
                  <div className="md:pr-6">
                    <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-border bg-muted/30 text-brand-medium">
                      <Users className="size-5" />
                    </div>
                    <p className="text-3xl font-bold tracking-tight text-foreground">{summary.data.profiles}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Perfis cadastrados</p>
                  </div>
                  <div className="md:border-l md:border-border md:px-6">
                    <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-border bg-muted/30 text-brand-medium">
                      <BookOpen className="size-5" />
                    </div>
                    <p className="text-3xl font-bold tracking-tight text-foreground">{summary.data.publishedCourses}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Cursos publicados</p>
                  </div>
                  <div className="md:border-l md:border-border md:pl-6">
                    <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-border bg-muted/30 text-brand-medium">
                      <GraduationCap className="size-5" />
                    </div>
                    <p className="text-3xl font-bold tracking-tight text-foreground">{summary.data.activeEnrollments}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Matrículas ativas</p>
                  </div>
                </div>

                <div className="grid gap-4 pt-5 sm:grid-cols-3 sm:gap-0">
                  <div className="flex items-center gap-3 sm:pr-5">
                    <CheckCircle2 className="size-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-lg font-semibold text-foreground">{summary.data.completedLessons}</p>
                      <p className="text-xs text-muted-foreground">Aulas concluídas</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:border-l sm:border-border sm:px-5">
                    <MessageSquareText className="size-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-lg font-semibold text-foreground">{summary.data.comments}</p>
                      <p className="text-xs text-muted-foreground">Comentários em aulas</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:border-l sm:border-border sm:pl-5">
                    <Waypoints className="size-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-lg font-semibold text-foreground">{summary.data.affiliateConversions}</p>
                      <p className="text-xs text-muted-foreground">Conversões de afiliados</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
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
