import { Award, CircleDollarSign, GraduationCap, Percent, Receipt, ShoppingBag } from "lucide-react";
import InstructorLayout from "@/app/layouts/InstructorLayout";
import { useInstructorReports } from "@/modules/instructor/hooks/useInstructorReports";
import DataTable from "@/shared/components/DataTable";
import PageHeader from "@/shared/components/PageHeader";
import StatCard from "@/shared/components/StatCard";
import { formatPrice } from "@/shared/utils/formatters";

const InstructorReportsPage = () => {
  const { data, isLoading, isError } = useInstructorReports();
  return (
    <InstructorLayout>
      <PageHeader title="Receita e relatórios" subtitle="Indicadores calculados somente sobre vendas pagas e certificados válidos." />
      {isLoading && <p className="text-sm text-muted-foreground">Carregando relatórios...</p>}
      {isError && <p className="text-sm text-destructive">Não foi possível carregar os relatórios.</p>}
      {data && <>
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Receita confirmada" value={formatPrice(data.revenueCents, data.currency)} icon={CircleDollarSign} />
          <StatCard label="Vendas pagas" value={data.paidSales.toLocaleString('pt-BR')} icon={ShoppingBag} />
          <StatCard label="Ticket médio" value={formatPrice(data.averageTicketCents, data.currency)} icon={Receipt} />
          <StatCard label="Matrículas ativas" value={data.activeEnrollments.toLocaleString('pt-BR')} icon={GraduationCap} />
          <StatCard label="Certificados emitidos" value={data.certificatesIssued.toLocaleString('pt-BR')} icon={Award} />
          <StatCard label="Taxa de certificação" value={`${data.certificationRate}%`} icon={Percent} />
        </div>
        <DataTable rows={data.courses} rowKey={(course) => course.id} emptyLabel="Nenhum curso para exibir." columns={[
          { header: 'Curso', cell: (course) => course.title },
          { header: 'Receita', cell: (course) => formatPrice(course.revenueCents, data.currency) },
          { header: 'Vendas', cell: (course) => course.paidSales.toLocaleString('pt-BR') },
          { header: 'Matrículas', cell: (course) => course.activeEnrollments.toLocaleString('pt-BR') },
          { header: 'Certificados', cell: (course) => course.certificatesIssued.toLocaleString('pt-BR') },
        ]} />
      </>}
    </InstructorLayout>
  );
};

export default InstructorReportsPage;
