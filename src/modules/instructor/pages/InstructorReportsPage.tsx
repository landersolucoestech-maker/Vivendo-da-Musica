import { Award, CircleDollarSign, GraduationCap, Percent, Receipt, ShoppingBag } from 'lucide-react';

import InstructorLayout from '@/app/layouts/InstructorLayout';
import { useInstructorReports } from '@/modules/instructor/hooks/useInstructorReports';
import DataTable from '@/shared/components/DataTable';
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
          <section className="mb-8">
            <Card>
              <CardHeader className="pb-4">
                <p className="vdm-eyebrow">Visão consolidada</p>
                <CardTitle className="mt-1 text-xl">Desempenho dos seus cursos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 border-b border-border pb-6 md:grid-cols-3 md:gap-0">
                  <div className="md:pr-6">
                    <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-border bg-muted/30 text-primary">
                      <CircleDollarSign className="size-5" />
                    </div>
                    <p className="text-3xl font-bold tracking-tight text-foreground">{formatPrice(data.revenueCents, data.currency)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Receita confirmada</p>
                  </div>
                  <div className="md:border-l md:border-border md:px-6">
                    <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-border bg-muted/30 text-primary">
                      <ShoppingBag className="size-5" />
                    </div>
                    <p className="text-3xl font-bold tracking-tight text-foreground">{data.paidSales.toLocaleString('pt-BR')}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Vendas pagas</p>
                  </div>
                  <div className="md:border-l md:border-border md:pl-6">
                    <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-border bg-muted/30 text-primary">
                      <GraduationCap className="size-5" />
                    </div>
                    <p className="text-3xl font-bold tracking-tight text-foreground">{data.activeEnrollments.toLocaleString('pt-BR')}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Matrículas ativas</p>
                  </div>
                </div>

                <div className="grid gap-4 pt-5 sm:grid-cols-3 sm:gap-0">
                  <div className="flex items-center gap-3 sm:pr-5">
                    <Receipt className="size-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-lg font-semibold text-foreground">{formatPrice(data.averageTicketCents, data.currency)}</p>
                      <p className="text-xs text-muted-foreground">Ticket médio</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:border-l sm:border-border sm:px-5">
                    <Award className="size-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-lg font-semibold text-foreground">{data.certificatesIssued.toLocaleString('pt-BR')}</p>
                      <p className="text-xs text-muted-foreground">Certificados emitidos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:border-l sm:border-border sm:pl-5">
                    <Percent className="size-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-lg font-semibold text-foreground">{data.certificationRate}%</p>
                      <p className="text-xs text-muted-foreground">Taxa de certificação</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

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
