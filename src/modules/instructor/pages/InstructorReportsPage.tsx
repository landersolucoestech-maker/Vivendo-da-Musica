import { Award, BarChart3, CircleDollarSign, GraduationCap, Percent, Receipt, ShoppingBag } from 'lucide-react';

import InstructorLayout from '@/app/layouts/InstructorLayout';
import { useInstructorReports } from '@/modules/instructor/hooks/useInstructorReports';
import DataTable from '@/shared/components/DataTable';
import StatCard from '@/shared/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { formatPrice } from '@/shared/utils/formatters';

const InstructorReportsPage = () => {
  const { data, isLoading, isError } = useInstructorReports();

  return (
    <InstructorLayout>
      <header className="mb-8">
        <p className="vdm-eyebrow">Desempenho</p>
        <h1 className="vdm-page-title mt-2">Receita e relatórios</h1>
        <p className="vdm-page-description">Indicadores consolidados a partir de vendas pagas, matrículas ativas e certificados válidos.</p>
      </header>

      {isLoading && (
        <div className="vdm-surface flex min-h-56 items-center justify-center">
          <div className="size-9 animate-spin rounded-full border-2 border-white/10 border-t-primary" />
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-red-300">Não foi possível carregar os relatórios.</div>
      )}

      {data && (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard label="Receita confirmada" value={formatPrice(data.revenueCents, data.currency)} icon={CircleDollarSign} />
            <StatCard label="Vendas pagas" value={data.paidSales.toLocaleString('pt-BR')} icon={ShoppingBag} />
            <StatCard label="Ticket médio" value={formatPrice(data.averageTicketCents, data.currency)} icon={Receipt} />
            <StatCard label="Matrículas ativas" value={data.activeEnrollments.toLocaleString('pt-BR')} icon={GraduationCap} />
            <StatCard label="Certificados emitidos" value={data.certificatesIssued.toLocaleString('pt-BR')} icon={Award} />
            <StatCard label="Taxa de certificação" value={`${data.certificationRate}%`} icon={Percent} />
          </div>

          <Card className="mb-8 border-primary/20 bg-primary/[0.04]">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <p className="vdm-eyebrow">Leitura consolidada</p>
                <CardTitle className="mt-2 text-xl">Resumo operacional</CardTitle>
              </div>
              <span className="vdm-icon-button border-primary/25 bg-primary/10 text-primary"><BarChart3 className="size-5" /></span>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="vdm-surface p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Receita por venda</p>
                <p className="mt-2 text-lg font-semibold text-white">{formatPrice(data.averageTicketCents, data.currency)}</p>
              </div>
              <div className="vdm-surface p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Certificados por matrícula</p>
                <p className="mt-2 text-lg font-semibold text-white">{data.certificationRate}%</p>
              </div>
              <div className="vdm-surface p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Cursos com dados</p>
                <p className="mt-2 text-lg font-semibold text-white">{data.courses.length}</p>
              </div>
            </CardContent>
          </Card>

          <section>
            <div className="mb-4">
              <p className="vdm-eyebrow">Detalhamento</p>
              <h2 className="mt-1 font-display text-xl font-semibold text-white">Desempenho por curso</h2>
            </div>
            <DataTable
              rows={data.courses}
              rowKey={(course) => course.id}
              emptyLabel="Nenhum curso com indicadores disponíveis."
              columns={[
                { header: 'Curso', cell: (course) => <span className="font-semibold text-white">{course.title}</span> },
                { header: 'Receita', cell: (course) => formatPrice(course.revenueCents, data.currency) },
                { header: 'Vendas', cell: (course) => course.paidSales.toLocaleString('pt-BR') },
                { header: 'Matrículas', cell: (course) => course.activeEnrollments.toLocaleString('pt-BR') },
                { header: 'Certificados', cell: (course) => course.certificatesIssued.toLocaleString('pt-BR') },
              ]}
            />
          </section>
        </>
      )}
    </InstructorLayout>
  );
};

export default InstructorReportsPage;
