import { BookOpen, CircleDollarSign, GraduationCap, ShoppingBag } from 'lucide-react';

import InstructorLayout from '@/app/layouts/InstructorLayout';
import { useInstructorDashboard } from '@/modules/instructor/hooks/useInstructorDashboard';
import StatCard from '@/shared/components/StatCard';
import StatusBadge from '@/shared/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { formatPrice } from '@/shared/utils/formatters';

const InstructorDashboard = () => {
  const { data, isLoading, isError } = useInstructorDashboard();

  return (
    <InstructorLayout>
      <header className="mb-8">
        <p className="vdm-eyebrow">Portal do instrutor</p>
        <h1 className="vdm-page-title mt-2">Visão geral dos seus cursos</h1>
        <p className="vdm-page-description">Acompanhe publicação, alunos, vendas e receita confirmada.</p>
      </header>

      {isLoading && (
        <div className="vdm-surface flex min-h-56 items-center justify-center">
          <div className="size-9 animate-spin rounded-full border-2 border-white/10 border-t-primary" />
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-4 text-sm text-destructive-foreground">
          Não foi possível carregar o dashboard do instrutor.
        </div>
      )}

      {data && (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Cursos" value={String(data.courses)} delta={`${data.publishedCourses} publicados`} icon={BookOpen} />
            <StatCard label="Alunos ativos" value={data.activeStudents.toLocaleString('pt-BR')} icon={GraduationCap} />
            <StatCard label="Vendas pagas" value={data.paidSales.toLocaleString('pt-BR')} icon={ShoppingBag} />
            <StatCard label="Receita confirmada" value={formatPrice(data.revenueCents, data.currency)} icon={CircleDollarSign} />
          </div>

          <Card>
            <CardHeader>
              <p className="vdm-eyebrow">Conteúdo</p>
              <CardTitle className="mt-1 text-xl">Cursos recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {!data.recentCourses.length ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Nenhum curso atribuído a este instrutor.</p>
              ) : (
                <div className="space-y-4">
                  {data.recentCourses.map((course) => (
                    <div key={course.id} className="flex flex-col gap-3 border-b border-white/8 pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-display font-semibold text-white">{course.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Criado em {new Intl.DateTimeFormat('pt-BR').format(new Date(course.createdAt))}
                        </p>
                      </div>
                      <StatusBadge status={course.status} label={course.status === 'published' ? 'Publicado' : course.status === 'draft' ? 'Rascunho' : 'Arquivado'} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </InstructorLayout>
  );
};

export default InstructorDashboard;
